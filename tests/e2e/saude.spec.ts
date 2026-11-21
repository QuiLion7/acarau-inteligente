import type { Locator, Page } from "@playwright/test"

import {
  ADMINISTRADOR,
  ANALISTA,
  entrarPelaApi,
  entrarPelaInterface,
  reiniciarDemo,
} from "./acesso-helpers"
import { esvaziarDatasets } from "./banco-e2e"
import { expect, test } from "./fixtures"
import {
  aguardarMapaPronto,
  bairroEstaSelecionadoNoMapa,
  type MapaNoRecipiente,
} from "./mapa-helpers"
import {
  importarEPublicarRoteiroPelaApi,
  importarRoteiroPelaInterface,
  NOME_DO_DATASET_DO_ROTEIRO,
} from "./saude-helpers"

const NOME_DO_PRE_CARREGADO = "Casos de saúde 2024-2026 (exemplo)"

const mapaDaSaude = (page: Page) =>
  page.getByRole("region", { name: "Mapa dos casos por bairro de Acaraú" })
const rankingDe = (page: Page) =>
  page.getByRole("region", { name: "Ranking dos bairros" })
const tabelaDe = (page: Page) =>
  page.getByRole("region", { name: "Casos por bairro" })
const linhaDoBairro = (page: Page, nome: string) =>
  tabelaDe(page).getByRole("row", { name: new RegExp(nome) })

// O visitante é a ausência de sessão: o cookie sai do mesmo contexto, que mantém a interceptação dos tiles.
async function virarVisitante(page: Page) {
  await page.context().clearCookies()
}

type PropriedadesDoBairro = {
  id: string
  situacao: string
  classe: number | null
}

// O que o mapa recebeu por bairro: situação e classe das propriedades do GeoJSON (a fonte que as camadas leem).
function propriedadesNoMapa(mapa: Locator): Promise<PropriedadesDoBairro[]> {
  return mapa.evaluate(async (recipiente) => {
    const { mapa: instancia } = recipiente as unknown as {
      mapa: MapaNoRecipiente
    }
    const dados = await instancia.getSource("bairros").getData()
    return (dados.features as { properties: PropriedadesDoBairro }[]).map(
      ({ properties }) => properties
    )
  })
}

test.describe("Saúde: dataset pré-carregado", () => {
  test.beforeEach(async () => {
    await reiniciarDemo()
  })

  test("E2E-05: ambiente limpo mostra o pré-carregado com a faixa, SINTETICO, um sem dados e um 0, e a Fontes o lista", async ({
    page,
  }) => {
    await page.goto("/saude")

    await expect(page.getByRole("note")).toContainText(
      "Dados sintéticos: números fictícios criados para a demonstração."
    )
    await expect(
      page.getByRole("heading", { level: 2, name: NOME_DO_PRE_CARREGADO })
    ).toBeVisible()
    await expect(page.locator("#conteudo").getByText("SINTETICO")).toBeVisible()
    await expect(
      linhaDoBairro(page, "Mucunã").getByText("sem dados")
    ).toBeVisible()
    await expect(
      linhaDoBairro(page, "Rodagem").getByRole("cell", {
        name: "0",
        exact: true,
      })
    ).toBeVisible()

    await page.goto("/fontes")
    const cartao = page
      .locator("#conteudo")
      .getByRole("article", { name: NOME_DO_PRE_CARREGADO })
    await expect(cartao).toContainText("SINTETICO")
    await expect(cartao).toContainText("2024 a 2026")
    await expect(cartao).toContainText("Casos notificados (sintético)")
  })

  test("E2E-04: Centro escolhido no ranking fica destacado no mapa e na tabela, na URL e depois de ir ao Território e voltar", async ({
    page,
  }) => {
    await page.goto("/saude")
    const mapa = mapaDaSaude(page)
    await aguardarMapaPronto(mapa)

    await rankingDe(page).getByRole("button", { name: "Centro" }).click()

    await expect(page).toHaveURL(/\/saude\?bairro=uv-10$/)
    await expect(linhaDoBairro(page, "Centro")).toHaveAttribute(
      "data-state",
      "selected"
    )
    expect(await bairroEstaSelecionadoNoMapa(mapa, "uv-10")).toBe(true)

    const menu = page.getByRole("navigation", { name: "Módulos" })
    await menu.getByRole("link", { name: "Território" }).click()
    await expect(page).toHaveURL(/\/territorio\?bairro=uv-10$/)
    await menu.getByRole("link", { name: "Saúde" }).click()
    await expect(page).toHaveURL(/\/saude\?bairro=uv-10$/)
    await expect(linhaDoBairro(page, "Centro")).toHaveAttribute(
      "data-state",
      "selected"
    )
    await aguardarMapaPronto(mapa)
    expect(await bairroEstaSelecionadoNoMapa(mapa, "uv-10")).toBe(true)
  })

  test("E2E-04: período que o dataset não tem mostra período sem dados, com a opção de limpar", async ({
    page,
  }) => {
    await page.goto("/saude?periodo=1999")

    await expect(
      page.getByRole("heading", { name: "Período sem dados" })
    ).toBeVisible()
    await expect(page.getByRole("table")).toHaveCount(0)
    await expect(page.locator("#conteudo")).not.toContainText("1999")

    await page.getByRole("button", { name: "Limpar período" }).click()

    await expect(page).toHaveURL(/\/saude$/)
    await expect(tabelaDe(page)).toBeVisible()
  })

  test("trocar o período recalcula o total e o mapa do mesmo dataset", async ({
    page,
  }) => {
    await page.goto("/saude")
    const mapa = mapaDaSaude(page)
    await aguardarMapaPronto(mapa)
    const total = page.getByRole("region", { name: "Total do período" })
    const totalDe2026 = await total.innerText()

    await page.getByRole("combobox", { name: "Período" }).click()
    await page.getByRole("option", { name: "2025" }).click()

    await expect(page).toHaveURL(/periodo=2025/)
    await expect(total).not.toHaveText(totalDe2026)
    const propriedades = await propriedadesNoMapa(mapa)
    expect(
      propriedades.filter(({ situacao }) => situacao === "valor")
    ).toHaveLength(18)
    expect(
      await page.evaluate(
        () => performance.getEntriesByName("territorio:mapa-interativo").length
      )
    ).toBe(1)
  })
})

test.describe("Saúde: importar, publicar e conferir", () => {
  test.beforeEach(async () => {
    await reiniciarDemo()
  })

  test("E2E-01: o analista importa o roteiro, resolve o ambíguo e o não reconhecido, vê privado e publica; o visitante confere mapa, ranking e tabela", async ({
    page,
  }) => {
    await entrarPelaApi(page, ANALISTA)
    const versaoId = await importarRoteiroPelaInterface(page)

    await expect(
      page.getByRole("heading", { level: 2, name: NOME_DO_DATASET_DO_ROTEIRO })
    ).toBeVisible()
    await expect(
      page.getByText("Privado: não visível ao visitante.")
    ).toBeVisible()

    await virarVisitante(page)
    await page.goto("/saude")
    await expect(
      page.getByRole("heading", { level: 2, name: NOME_DO_PRE_CARREGADO })
    ).toBeVisible()
    await page.goto(`/saude?versao=${versaoId}`)
    await expect(
      page.getByRole("heading", { name: "Dataset não encontrado" })
    ).toBeVisible()
    await expect(page.locator("#conteudo")).not.toContainText(
      NOME_DO_DATASET_DO_ROTEIRO
    )

    await entrarPelaApi(page, ANALISTA)
    await page.goto(`/saude?versao=${versaoId}`)
    await page.getByRole("button", { name: "Publicar esta versão" }).click()
    await expect(
      page.getByRole("button", { name: "Despublicar esta versão" })
    ).toBeVisible()

    await virarVisitante(page)
    await page.goto("/saude")
    await expect(
      page.getByRole("heading", { level: 2, name: NOME_DO_DATASET_DO_ROTEIRO })
    ).toBeVisible()
    const mapa = mapaDaSaude(page)
    await aguardarMapaPronto(mapa)

    // Mesmo período (2026) nas três apresentações: o valor de cada bairro é o mesmo e igual ao CSV (CA-02.19).
    const valoresDoCsv: [string, string][] = [
      ["Centro", "51"],
      ["São Benedito", "21"],
      ["Pedrinhas", "13"],
      ["Morada dos Ventos", "11"],
      ["Rodagem", "0"],
    ]
    for (const [bairro, casos] of valoresDoCsv) {
      const noRanking = rankingDe(page)
        .getByRole("listitem")
        .filter({
          has: page.getByRole("button", { name: bairro, exact: true }),
        })
      await expect(noRanking).toContainText(
        `${casos} ${casos === "1" ? "caso" : "casos"}`
      )
      await expect(
        linhaDoBairro(page, bairro).getByRole("cell", {
          name: casos,
          exact: true,
        })
      ).toBeVisible()
    }
    await expect(
      page.getByText("Soma dos 5 bairros com dados no período.")
    ).toBeVisible()
    await expect(
      page.getByText(
        "Fora da cobertura: 8 casos em 1 localidade, fora do total e fora do mapa."
      )
    ).toBeVisible()
    const propriedades = await propriedadesNoMapa(mapa)
    const situacaoNoMapa = (id: string) =>
      propriedades.find((item) => item.id === id)?.situacao
    expect(situacaoNoMapa("uv-10")).toBe("valor")
    expect(situacaoNoMapa("uv-13")).toBe("zero")
    expect(situacaoNoMapa("uv-04")).toBe("sem-dados")
    expect(
      propriedades.filter(({ situacao }) => situacao === "valor")
    ).toHaveLength(4)

    await entrarPelaApi(page, ANALISTA)
    await page.goto("/saude/datasets")
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: NOME_DO_DATASET_DO_ROTEIRO })
        .getByText("Publicado")
    ).toBeVisible()
  })
})

test.describe("Saúde: reinício da demonstração pela Administração", () => {
  test("E2E-06: o administrador reinicia a demo com confirmação e a Saúde volta ao pré-carregado", async ({
    page,
  }) => {
    await reiniciarDemo()
    await entrarPelaInterface(page, ADMINISTRADOR)
    await importarEPublicarRoteiroPelaApi(page)
    await page.goto("/saude")
    await expect(
      page.getByRole("heading", { level: 2, name: NOME_DO_DATASET_DO_ROTEIRO })
    ).toBeVisible()

    await page.goto("/admin")
    await page.getByRole("button", { name: "Reiniciar a demonstração" }).click()
    const dialogo = page.getByRole("alertdialog")
    await expect(dialogo).toContainText("apaga os datasets importados")
    await dialogo.getByRole("button", { name: "Cancelar" }).click()
    await expect(dialogo).toBeHidden()
    await page.goto("/saude")
    await expect(
      page.getByRole("heading", { level: 2, name: NOME_DO_DATASET_DO_ROTEIRO })
    ).toBeVisible()

    await page.goto("/admin")
    await page.getByRole("button", { name: "Reiniciar a demonstração" }).click()
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Reiniciar" })
      .click()
    await expect(page.getByRole("alertdialog")).toBeHidden()

    await page.goto("/saude")
    await expect(
      page.getByRole("heading", { level: 2, name: NOME_DO_PRE_CARREGADO })
    ).toBeVisible()
    await virarVisitante(page)
    await page.goto("/fontes")
    await expect(
      page
        .locator("#conteudo")
        .getByRole("article", { name: NOME_DO_PRE_CARREGADO })
    ).toBeVisible()
    await expect(
      page
        .locator("#conteudo")
        .getByRole("article", { name: NOME_DO_DATASET_DO_ROTEIRO })
    ).toHaveCount(0)
  })
})

test.describe("Saúde: nenhum dataset", () => {
  test.beforeEach(async () => {
    await reiniciarDemo()
    await esvaziarDatasets()
  })

  test.afterAll(async () => {
    await reiniciarDemo()
  })

  test("E2E-10: o analista vê o vazio com Importar CSV e o visitante vê o vazio sem o link", async ({
    page,
  }) => {
    await entrarPelaApi(page, ANALISTA)
    await page.goto("/saude")

    await expect(
      page.getByRole("heading", { name: "Nenhum dataset importado" })
    ).toBeVisible()
    await expect(
      page.locator("#conteudo").getByRole("link", { name: "Importar CSV" })
    ).toHaveAttribute("href", "/saude/importar")

    await virarVisitante(page)
    await page.goto("/saude")

    await expect(
      page.getByRole("heading", { name: "Nenhum dataset publicado" })
    ).toBeVisible()
    await expect(
      page.locator("#conteudo").getByRole("link", { name: "Importar CSV" })
    ).toHaveCount(0)
  })
})
