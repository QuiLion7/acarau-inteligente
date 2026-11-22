import AxeBuilder from "@axe-core/playwright"
import type { Page } from "@playwright/test"

import { expect, test } from "./fixtures"
import {
  aguardarMapaPronto,
  bairroEstaSelecionadoNoMapa,
  clicarNoPonto,
  ESCOLAS,
  type MapaNoRecipiente,
} from "./mapa-helpers"

async function violacoesGraves(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations.filter(
    ({ impact }) => impact === "serious" || impact === "critical"
  )
}

const mapaDaEducacao = (page: Page) =>
  page.getByRole("region", { name: "Mapa das escolas por bairro de Acaraú" })
const cardDe = (page: Page, nome: string) =>
  page.getByRole("group", { name: nome, exact: true })
const tabelaPorBairro = (page: Page) =>
  page.getByRole("region", { name: "Escolas por bairro" })

test.describe("Educação: visitante sem sessão", () => {
  test("EP-03 E2E-08: a página vem completa, com os cinco cards e sem nenhum botão de escrita", async ({
    page,
  }) => {
    await page.goto("/educacao")

    await expect(
      page.getByRole("heading", { level: 1, name: "Educação" })
    ).toBeVisible()
    await expect(
      page.locator("#conteudo").getByRole("heading", {
        name: "Disponível em breve",
      })
    ).toHaveCount(0)
    for (const [titulo, valor] of [
      ["Registros na base", "62"],
      ["Estabelecimentos escolares georreferenciados na base disponível", "58"],
      ["Sem localização", "4"],
      ["Dentro dos bairros da sede", "24"],
      ["Fora da cobertura dos bairros", "33"],
    ]) {
      const card = cardDe(page, titulo!)
      await expect(card.getByText(valor!, { exact: true })).toBeVisible()
      await expect(card).toContainText(
        "Fonte: Catálogo de escolas do INEP (CSV fornecido). Data de referência: Não informada."
      )
    }
    await expect(cardDe(page, "Fora da cobertura dos bairros")).toContainText(
      "A escola fora do limite municipal é citada à parte."
    )
    await expect(
      page.getByRole("heading", { name: "Lista de escolas" })
    ).toBeVisible()
    await expect(
      page.locator("#conteudo").getByRole("button", {
        name: /importar|publicar|reiniciar|exportar|excluir|salvar/i,
      })
    ).toHaveCount(0)
    await expect(
      page.locator("#conteudo").getByRole("link", { name: /importar/i })
    ).toHaveCount(0)
  })
})

test.describe("Educação: mapa", () => {
  test("EP-03 E2E-09: a fonte das escolas tem 58 pontos e nenhum das 4 sem localização; clicar num ponto abre a ficha", async ({
    page,
  }) => {
    await page.goto("/educacao")
    const mapa = mapaDaEducacao(page)
    await aguardarMapaPronto(mapa)

    const codigosNoMapa = await mapa.evaluate(async (recipiente) => {
      const { mapa: instancia } = recipiente as unknown as {
        mapa: MapaNoRecipiente
      }
      const dados = await instancia.getSource("escolas").getData()
      return (dados.features as { properties: { codigoInep: string } }[]).map(
        ({ properties }) => properties.codigoInep
      )
    })
    const semLocalizacao = ESCOLAS.filter(
      ({ estado }) => estado === "sem-localizacao"
    ).map(({ codigoInep }) => codigoInep)
    expect(codigosNoMapa).toHaveLength(58)
    expect(semLocalizacao).toHaveLength(4)
    for (const codigo of semLocalizacao) {
      expect(codigosNoMapa).not.toContain(codigo)
    }

    const escola = ESCOLAS.find(
      ({ estado, posicao }) => estado === "dentro-de-bairro" && posicao
    )!
    await clicarNoPonto(mapa, escola.posicao!)

    const ficha = page.getByRole("dialog", { name: "Ficha da escola" })
    await expect(ficha).toBeVisible()
    await expect(
      ficha.getByRole("article", { name: escola.nome })
    ).toContainText(escola.codigoInep)
    await expect(page).toHaveURL(/\/educacao$/)
  })
})

test.describe("Educação: bairro escolhido", () => {
  test("EP-03 E2E-10: com a UV 10 o bairro fica destacado no mapa e na tabela, o card diz 8 e a lista tem 8", async ({
    page,
  }) => {
    await page.goto("/educacao?bairro=uv-10")
    const mapa = mapaDaEducacao(page)
    await aguardarMapaPronto(mapa)

    expect(await bairroEstaSelecionadoNoMapa(mapa, "uv-10")).toBe(true)
    await expect(
      tabelaPorBairro(page).getByRole("row", { name: /Centro/ })
    ).toHaveAttribute("data-state", "selected")
    await expect(
      cardDe(page, "Escolas em Centro").getByText("8 escolas")
    ).toBeVisible()
    await expect(page.getByText("Mostrando 1 a 8 de 8 escolas.")).toBeVisible()
    await expect(page.getByRole("combobox", { name: "Bairro" })).toHaveValue(
      "Centro (UV 10)"
    )
  })
})

test.describe("Educação: bairro não reconhecido", () => {
  test("EP-03 E2E-05 (Educação): bairro inválido mostra o estado, não exibe o valor e a tela segue; limpar funciona", async ({
    page,
  }) => {
    await page.goto("/educacao?bairro=uv-99")

    await expect(
      page.getByRole("heading", { name: "Bairro não reconhecido" })
    ).toBeVisible()
    await expect(page.locator("#conteudo")).not.toContainText("uv-99")
    await expect(cardDe(page, "Registros na base")).toBeVisible()
    await expect(
      page.getByText("Mostrando 1 a 10 de 62 escolas.")
    ).toBeVisible()

    await page.getByRole("button", { name: "Limpar bairro" }).click()

    await expect(page).toHaveURL(/\/educacao$/)
    await expect(
      page.getByRole("heading", { name: "Bairro não reconhecido" })
    ).toHaveCount(0)
  })
})

test.describe("Educação: lista de escolas", () => {
  const filtro = async (page: Page, nome: string, opcao: string) => {
    await page.getByRole("combobox", { name: nome }).click()
    await page.getByRole("option", { name: opcao }).click()
  }

  test("EP-03 E2E-12: Estadual com Rural lista só essas; combinação sem resultado mostra o vazio; limpar volta às 62", async ({
    page,
  }) => {
    await page.goto("/educacao")

    await filtro(page, "Dependência", "Estadual")
    await filtro(page, "Localização", "Rural")
    await expect(page.getByText("Mostrando 1 a 4 de 4 escolas.")).toBeVisible()
    await expect(
      page.getByRole("row", { name: /Urbana|Municipal|Privada/ })
    ).toHaveCount(0)

    await filtro(page, "Dependência", "Privada")
    await expect(
      page.getByRole("heading", { name: "Nenhuma escola encontrada" })
    ).toBeVisible()
    await page.getByRole("button", { name: "Limpar filtros" }).click()

    await expect(
      page.getByText("Mostrando 1 a 10 de 62 escolas.")
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Nenhuma escola encontrada" })
    ).toHaveCount(0)
  })

  test("EP-03 E2E-12: a busca pelo código INEP 23000910 acha a escola fora do limite municipal", async ({
    page,
  }) => {
    await page.goto("/educacao")

    await page
      .getByRole("searchbox", { name: "Buscar escola" })
      .fill("23000910")

    await expect(page.getByText("Mostrando 1 a 1 de 1 escola.")).toBeVisible()
    await expect(
      page
        .getByRole("region", { name: "Lista de escolas" })
        .getByRole("row", { name: /Fora do limite municipal/ })
    ).toHaveCount(1)
  })

  test("EP-03 E2E-13: a ficha de escola sem localização, pela lista, mostra a etiqueta e nenhuma coordenada; o quadro lista as pendências", async ({
    page,
  }) => {
    await page.goto("/educacao")
    const escola = ESCOLAS.find(({ estado }) => estado === "sem-localizacao")!
    await page
      .getByRole("searchbox", { name: "Buscar escola" })
      .fill(escola.codigoInep)

    await page.getByRole("button", { name: escola.nome }).click()

    const ficha = page.getByRole("dialog", { name: "Ficha da escola" })
    await expect(ficha).toContainText("NAO_GEOREFERENCIADO")
    await expect(ficha).toContainText("Sem localização")
    await expect(ficha).not.toContainText(/-?\d{1,3}\.\d{4,}/)
    await ficha.getByRole("button", { name: "Fechar" }).click()
    await expect(ficha).toHaveCount(0)

    const pendencias = page.getByRole("region", {
      name: "Pendências de qualidade da base",
    })
    await expect(pendencias.getByRole("listitem")).toHaveCount(5)
    await expect(pendencias).toContainText(
      `${escola.nome} (INEP ${escola.codigoInep})`
    )
    await expect(pendencias).toContainText("não inventa coordenada")
    await expect(
      page.getByRole("button", { name: "Como os números são calculados" })
    ).toHaveAttribute("aria-expanded", "false")
  })
})

test.describe("Educação: fundo de mapa bloqueado", () => {
  test.use({ mapaBase: "indisponivel" })

  test("EP-03 E2E-14: mostra o aviso e a tabela, a lista e a ficha seguem utilizáveis", async ({
    page,
  }) => {
    await page.goto("/educacao")

    await expect(page.getByTestId("aviso-mapa-base")).toHaveText(
      "Fundo de mapa indisponível; as camadas da demonstração continuam visíveis."
    )
    await aguardarMapaPronto(mapaDaEducacao(page))
    await expect(
      tabelaPorBairro(page).getByRole("row", { name: /Centro/ })
    ).toBeVisible()
    const escola = ESCOLAS.find(({ estado }) => estado === "dentro-de-bairro")!
    await page
      .getByRole("searchbox", { name: "Buscar escola" })
      .fill(escola.codigoInep)
    await page.getByRole("button", { name: escola.nome }).click()
    await expect(
      page.getByRole("dialog", { name: "Ficha da escola" })
    ).toContainText(escola.codigoInep)
  })
})

test.describe("Educação: metodologia e acessibilidade", () => {
  test("EP-03 E2E-16 (Educação): com a metodologia aberta, a ficha aberta e com bairro não reconhecido, não há violação grave", async ({
    page,
  }) => {
    await page.goto("/educacao?bairro=uv-10")
    await aguardarMapaPronto(mapaDaEducacao(page))
    await page
      .getByRole("button", { name: "Como os números são calculados" })
      .click()
    await expect(page.getByText("menor código de UV")).toBeVisible()
    expect(await violacoesGraves(page)).toEqual([])

    await page.goto("/educacao")
    const escola = ESCOLAS.find(({ estado }) => estado === "dentro-de-bairro")!
    await page
      .getByRole("searchbox", { name: "Buscar escola" })
      .fill(escola.codigoInep)
    await page.getByRole("button", { name: escola.nome }).click()
    await expect(
      page.getByRole("dialog", { name: "Ficha da escola" })
    ).toBeVisible()
    expect(await violacoesGraves(page)).toEqual([])

    await page.goto("/educacao?bairro=uv-99")
    await expect(
      page.getByRole("heading", { name: "Bairro não reconhecido" })
    ).toBeVisible()
    expect(await violacoesGraves(page)).toEqual([])
  })
})
