import type { Page } from "@playwright/test"

import { expect, test } from "./fixtures"
import {
  aguardarMapaPronto,
  bairroEstaSelecionadoNoMapa,
  clicarNoPonto,
  ESCOLAS,
  pontoInteriorDe,
  type MapaNoRecipiente,
} from "./mapa-helpers"

const mapaDe = (page: Page) =>
  page.getByRole("region", { name: "Mapa dos bairros de Acaraú" })

const faixaDe = (page: Page) =>
  page.getByRole("region", { name: "Contexto da consulta" })
const bairroDaFaixa = (page: Page) =>
  faixaDe(page).getByText("Bairro:").locator("xpath=following-sibling::dd")

test.describe("território: bairro na URL", () => {
  const INVALIDOS = [
    ["nome em texto livre", "Centro"],
    ["ID inexistente", "uv-99"],
    ["HTML", "<b>x</b>"],
    ["texto longo", "a".repeat(120)],
  ] as const

  for (const [descricao, valor] of INVALIDOS) {
    test(`bairro inválido (${descricao}) mostra "não reconhecido", sem eco do valor, e limpa`, async ({
      page,
    }) => {
      await page.goto(`/territorio?bairro=${encodeURIComponent(valor)}`)

      const conteudo = page.locator("#conteudo")
      await expect(
        conteudo.getByRole("heading", { name: "Bairro não reconhecido" })
      ).toBeVisible()
      await expect(bairroDaFaixa(page)).toHaveText("Não reconhecido")
      await expect(conteudo).not.toContainText(valor.slice(0, 10))
      await expect(conteudo.locator("b")).toHaveCount(0)

      await conteudo.getByRole("link", { name: "Limpar bairro" }).click()

      await expect(page).toHaveURL(/\/territorio$/)
      await expect(bairroDaFaixa(page)).toHaveText("Todos")
      await expect(
        conteudo.getByRole("searchbox", { name: "Buscar bairro" })
      ).toBeVisible()
    })
  }
})

test.describe("território: seleção de bairro sem o mapa", () => {
  test("selecionar pela lista põe uv-10 na URL e mostra a ficha e a faixa do Centro", async ({
    page,
  }) => {
    await page.goto("/territorio")

    await page
      .getByRole("tabpanel")
      .getByRole("button", { name: /Centro/ })
      .click()

    await expect(page).toHaveURL(/\/territorio\?bairro=uv-10$/)
    await expect(bairroDaFaixa(page)).toHaveText("Centro")
    await expect(
      page.getByRole("article").getByRole("heading", { name: "Centro" })
    ).toBeVisible()
    await expect(page.getByRole("row", { name: /Centro/ })).toHaveAttribute(
      "data-state",
      "selected"
    )
  })

  test("selecionar pela tabela dá o mesmo resultado e o bairro persiste ao recarregar", async ({
    page,
  }) => {
    await page.goto("/territorio")

    await page
      .getByRole("table")
      .getByRole("button", { name: "São Benedito" })
      .click()

    await expect(page).toHaveURL(/\/territorio\?bairro=uv-03$/)
    await expect(bairroDaFaixa(page)).toHaveText("São Benedito")
    await page.reload()
    await expect(bairroDaFaixa(page)).toHaveText("São Benedito")
    await expect(
      page.getByRole("article").getByRole("heading", { name: "São Benedito" })
    ).toBeVisible()
  })

  test("busca por 'sao benedito' e escolhe o bairro só com o teclado", async ({
    page,
  }) => {
    await page.goto("/territorio")

    await page
      .getByRole("searchbox", { name: "Buscar bairro" })
      .fill("sao  benedito")
    await page.getByRole("tabpanel").getByRole("button").press("Enter")

    await expect(page).toHaveURL(/\/territorio\?bairro=uv-03$/)
  })

  test("a ficha de Rodagem mostra a área não informada na lei", async ({
    page,
  }) => {
    await page.goto("/territorio?bairro=uv-13")

    const ficha = page.getByRole("article")
    await expect(ficha.getByRole("heading", { name: "Rodagem" })).toBeVisible()
    await expect(ficha).toContainText("Não informada na lei")
    await expect(ficha).toContainText(
      "não é arquivo oficial homologado da Prefeitura"
    )
  })
})

test.describe("território: seleção pelo mapa", () => {
  test("clicar no ponto interior do Centro sincroniza destaque, ficha, tabela, faixa e URL", async ({
    page,
  }) => {
    await page.goto("/territorio")
    const mapa = mapaDe(page)
    await aguardarMapaPronto(mapa)

    await clicarNoPonto(mapa, pontoInteriorDe("uv-10"))

    await expect(page).toHaveURL(/\/territorio\?bairro=uv-10$/)
    await expect(bairroDaFaixa(page)).toHaveText("Centro")
    await expect(
      page.getByRole("article").getByRole("heading", { name: "Centro" })
    ).toBeVisible()
    await expect(page.getByRole("row", { name: /Centro/ })).toHaveAttribute(
      "data-state",
      "selected"
    )
    expect(await bairroEstaSelecionadoNoMapa(mapa, "uv-10")).toBe(true)
  })

  test("selecionar pela lista e pela tabela troca o destaque no mapa", async ({
    page,
  }) => {
    await page.goto("/territorio")
    const mapa = mapaDe(page)
    await aguardarMapaPronto(mapa)

    await page
      .getByRole("tabpanel")
      .getByRole("button", { name: /Centro/ })
      .click()
    await expect(page).toHaveURL(/bairro=uv-10$/)
    expect(await bairroEstaSelecionadoNoMapa(mapa, "uv-10")).toBe(true)

    await page
      .getByRole("table")
      .getByRole("button", { name: "São Benedito" })
      .click()
    await expect(page).toHaveURL(/bairro=uv-03$/)
    expect(await bairroEstaSelecionadoNoMapa(mapa, "uv-03")).toBe(true)
    expect(await bairroEstaSelecionadoNoMapa(mapa, "uv-10")).toBe(false)
    // Selecionar não recria o mapa: o `load` (e a marca de desempenho) aconteceu uma vez só.
    expect(
      await page.evaluate(
        () => performance.getEntriesByName("territorio:mapa-interativo").length
      )
    ).toBe(1)
  })

  test("com bairro na URL o mapa abre com ele destacado", async ({ page }) => {
    await page.goto("/territorio?bairro=uv-10")
    const mapa = mapaDe(page)
    await aguardarMapaPronto(mapa)

    expect(await bairroEstaSelecionadoNoMapa(mapa, "uv-10")).toBe(true)
  })

  test("o controle de camadas esconde o limite municipal sem tirar os bairros", async ({
    page,
  }) => {
    await page.goto("/territorio")
    await aguardarMapaPronto(mapaDe(page))
    const controle = page.getByRole("group", { name: "Camadas do mapa" })

    await controle.getByText("Limite municipal").click()

    await expect(
      controle.getByRole("switch", { name: "Limite municipal" })
    ).not.toBeChecked()
    await expect(
      controle.getByRole("switch", { name: "Bairros" })
    ).toBeChecked()
  })

  test("a legenda mostra a cobertura de 24 bairros da sede", async ({
    page,
  }) => {
    await page.goto("/territorio")

    await expect(page.getByRole("region", { name: "Legenda" })).toContainText(
      "24 bairros"
    )
  })
})

test.describe("território: fundo de mapa bloqueado", () => {
  test.use({ mapaBase: "indisponivel" })

  test("mostra o aviso, mantém as camadas e não derruba a tela, sem erro de app no console", async ({
    page,
  }) => {
    await page.goto("/territorio")

    await expect(page.getByTestId("aviso-mapa-base")).toHaveText(
      "Fundo de mapa indisponível; as camadas da demonstração continuam visíveis."
    )
    const mapa = mapaDe(page)
    await aguardarMapaPronto(mapa)
    await expect(mapa.locator("canvas")).toBeVisible()
    await clicarNoPonto(mapa, pontoInteriorDe("uv-10"))
    await expect(page).toHaveURL(/bairro=uv-10$/)
  })
})

test.describe("território: escolas", () => {
  const controleDe = (page: Page) =>
    page.getByRole("group", { name: "Camadas do mapa" })

  test("o controle só oferece bairros, limite e escolas; ligar escolas mostra 58 marcadores e a legenda", async ({
    page,
  }) => {
    await page.goto("/territorio")
    const mapa = mapaDe(page)
    await aguardarMapaPronto(mapa)
    const controle = controleDe(page)

    await expect(controle.getByRole("switch")).toHaveCount(3)
    for (const nome of ["Bairros", "Limite municipal", "Escolas"]) {
      await expect(controle.getByRole("switch", { name: nome })).toBeVisible()
    }
    await expect(controle).not.toContainText(/lagoa|distrito|rua|rio|setor/i)
    await expect(
      controle.getByRole("switch", { name: "Escolas" })
    ).not.toBeChecked()

    await controle.getByText("Escolas").click()

    const legenda = page.getByRole("region", { name: "Legenda" })
    await expect(legenda).toContainText(
      "58 estabelecimentos escolares georreferenciados na base disponível."
    )
    await expect(legenda).toContainText(
      "Escola dentro de bairro: 24 marcadores"
    )
    await expect(legenda).toContainText(
      "Escola fora da cobertura dos bairros: 33 marcadores"
    )
    await expect(legenda).toContainText(
      "Escola fora do limite municipal: 1 marcador"
    )
    const estado = await mapa.evaluate(async (recipiente) => {
      const { mapa } = recipiente as unknown as { mapa: MapaNoRecipiente }
      return {
        marcadores: (await mapa.getSource("escolas").getData()).features.length,
        visivel: mapa.getLayoutProperty("escolas-marcadores", "visibility"),
        icones: [
          "escola-dentro-de-bairro",
          "escola-fora-da-cobertura",
          "escola-fora-do-limite",
        ].map((nome) => mapa.hasImage(nome)),
      }
    })
    expect(estado).toEqual({
      marcadores: 58,
      visivel: "visible",
      icones: [true, true, true],
    })
  })

  test("clicar no marcador de uma escola abre a ficha dela, sem selecionar o bairro", async ({
    page,
  }) => {
    await page.goto("/territorio")
    const mapa = mapaDe(page)
    await aguardarMapaPronto(mapa)
    await controleDe(page).getByText("Escolas").click()
    const escola = ESCOLAS.find(
      ({ estado, posicao }) => estado === "dentro-de-bairro" && posicao
    )!

    await clicarNoPonto(mapa, escola.posicao!)

    await expect(
      page.getByRole("tab", { name: "Escolas", selected: true })
    ).toBeVisible()
    const ficha = page.getByRole("article", { name: escola.nome })
    await expect(ficha).toContainText(escola.codigoInep)
    await expect(ficha).toContainText("Situação de cobertura")
    await expect(page).toHaveURL(/\/territorio$/)
  })

  test("a tabela de escolas filtra por dependência e localização e o total bate com as linhas", async ({
    page,
  }) => {
    await page.goto("/territorio")
    await page.getByRole("tab", { name: "Escolas" }).click()
    const painel = page.getByRole("tabpanel")

    await expect(
      painel.getByText("Mostrando 1 a 10 de 62 escolas.")
    ).toBeVisible()
    await painel.getByRole("combobox", { name: "Dependência" }).click()
    await page.getByRole("option", { name: "Privada" }).click()
    await painel.getByRole("combobox", { name: "Localização" }).click()
    await page.getByRole("option", { name: "Urbana" }).click()

    await expect(
      painel.getByText("Mostrando 1 a 9 de 9 escolas.")
    ).toBeVisible()
    await expect(painel.getByRole("row")).toHaveCount(10)
    await expect(
      painel.getByRole("row", { name: /Rural|Municipal/ })
    ).toHaveCount(0)
  })

  test("abrir uma escola pela tabela mostra a ficha e a ressalva de bairro sem escola aparece na tabela", async ({
    page,
  }) => {
    await page.goto("/territorio?bairro=uv-10")
    await page.getByRole("tab", { name: "Escolas" }).click()

    await page.getByRole("button", { name: "VIRGEM PODEROSA ESC" }).click()

    await expect(
      page.getByRole("article", { name: "VIRGEM PODEROSA ESC" })
    ).toContainText("23000872")

    await page.goto("/territorio?bairro=uv-01")
    await page.getByRole("tab", { name: "Escolas" }).click()
    await expect(page.getByRole("tabpanel")).toContainText(
      "Nenhuma escola da base disponível dentro deste bairro. A base não é um censo completo."
    )
  })

  test("o quadro de qualidade mostra 62, 58, 4, 34 e 1 com as listas", async ({
    page,
  }) => {
    await page.goto("/territorio")

    const quadro = page.getByRole("region", {
      name: "Qualidade da base de escolas",
    })
    await expect(quadro).toContainText("62")
    await expect(quadro).toContainText("COLEGIO ETHOS (INEP 23278650)")
    await expect(quadro).toContainText(
      "ANTONIO FERREIRA SALES EEIEF (INEP 23000910)"
    )
    await expect(quadro).toContainText("possível inconsistência na fonte")
  })
})
