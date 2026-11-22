import type { Page } from "@playwright/test"

import {
  ADMINISTRADOR,
  ANALISTA,
  entrarPelaApi,
  reiniciarDemo,
} from "./acesso-helpers"
import { violacoesGraves } from "./acessibilidade-helpers"
import { expect, test } from "./fixtures"
import { aguardarMapaPronto } from "./mapa-helpers"
import {
  bytesSinteticos,
  decidirBairrosDoRoteiro,
  enviarArquivo,
} from "./saude-helpers"

const larguraDaPagina = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth)

test.describe("Saúde: acessibilidade, 360 px e console (E2E-08)", () => {
  test.beforeEach(async () => {
    await reiniciarDemo()
  })

  test("a Saúde do visitante, com o mapa pronto e o gráfico, não tem violação grave", async ({
    page,
  }) => {
    await page.goto("/saude?bairro=uv-10")
    await aguardarMapaPronto(
      page.getByRole("region", { name: "Mapa dos casos por bairro de Acaraú" })
    )
    await expect(
      page.getByRole("img", { name: /Gráfico de linha/ })
    ).toBeVisible()

    expect(await violacoesGraves(page)).toEqual([])
  })

  test("EP-03 E2E-16: a Saúde com a aba Tabela e a metodologia abertas, e com bairro não reconhecido, não tem violação grave", async ({
    page,
  }) => {
    await page.goto("/saude?bairro=uv-10")
    await page.getByRole("tab", { name: "Tabela" }).click()
    await expect(
      page.getByRole("region", { name: "Casos por bairro" })
    ).toBeVisible()
    await page
      .getByRole("button", { name: "Como os números são calculados" })
      .click()
    await expect(page.getByText("anual", { exact: true })).toBeVisible()
    expect(await violacoesGraves(page)).toEqual([])

    await page.goto("/saude?bairro=uv-99")
    await expect(
      page.getByRole("heading", { name: "Bairro não reconhecido" })
    ).toBeVisible()
    expect(await violacoesGraves(page)).toEqual([])
  })

  test("a Saúde com período sem dados também não tem violação grave", async ({
    page,
  }) => {
    await page.goto("/saude?periodo=1999")
    await expect(
      page.getByRole("heading", { name: "Período sem dados" })
    ).toBeVisible()

    expect(await violacoesGraves(page)).toEqual([])
  })

  test("o assistente, do envio à confirmação, não tem violação grave em nenhum passo", async ({
    page,
  }) => {
    await entrarPelaApi(page, ANALISTA)
    await page.goto("/saude/importar")
    expect(await violacoesGraves(page)).toEqual([])

    await enviarArquivo(
      page,
      "saude-roteiro_DEMO.csv",
      bytesSinteticos("saude-roteiro_DEMO.csv")
    )
    await expect(
      page.getByRole("heading", { name: "Colunas do arquivo" })
    ).toBeVisible()
    expect(await violacoesGraves(page)).toEqual([])

    await page.getByRole("button", { name: "Continuar" }).click()
    await expect(page.getByRole("heading", { name: "Bairros" })).toBeVisible()
    expect(await violacoesGraves(page)).toEqual([])

    await decidirBairrosDoRoteiro(page)
    await page.getByRole("button", { name: "Continuar" }).click()
    await expect(page.getByRole("heading", { name: "Validação" })).toBeVisible()
    expect(await violacoesGraves(page)).toEqual([])

    await page.getByRole("button", { name: "Continuar" }).click()
    await expect(
      page.getByRole("heading", { name: "Confirmar importação" })
    ).toBeVisible()
    expect(await violacoesGraves(page)).toEqual([])
  })

  test("a lista de datasets e o relatório não têm violação grave", async ({
    page,
  }) => {
    await entrarPelaApi(page, ANALISTA)
    await page.goto("/saude/datasets")
    await expect(page.getByRole("table")).toBeVisible()
    expect(await violacoesGraves(page)).toEqual([])

    await page.getByRole("button", { name: /^Ver relatório / }).click()
    await expect(
      page.getByRole("dialog", { name: "Relatório de processamento" })
    ).toBeVisible()
    expect(await violacoesGraves(page)).toEqual([])
  })

  test("a Administração, com a confirmação aberta, não tem violação grave", async ({
    page,
  }) => {
    await entrarPelaApi(page, ADMINISTRADOR)
    await page.goto("/admin")
    expect(await violacoesGraves(page)).toEqual([])

    await page.getByRole("button", { name: "Reiniciar a demonstração" }).click()
    await expect(page.getByRole("alertdialog")).toBeVisible()
    expect(await violacoesGraves(page)).toEqual([])
  })
})

test.describe("Saúde em 360 px (RNF-02.03)", () => {
  test.use({ viewport: { width: 360, height: 740 } })

  test.beforeEach(async () => {
    await reiniciarDemo()
  })

  test("a Saúde com o mapa pronto não rola na horizontal", async ({ page }) => {
    await page.goto("/saude?bairro=uv-10")
    await aguardarMapaPronto(
      page.getByRole("region", { name: "Mapa dos casos por bairro de Acaraú" })
    )
    await expect(
      page.getByRole("img", { name: /Gráfico de linha/ })
    ).toBeVisible()

    expect(await larguraDaPagina(page)).toBeLessThanOrEqual(360)
  })

  test("EP-03 E2E-17: a Saúde com a aba Tabela e a metodologia abertas não rola na horizontal em 360 px", async ({
    page,
  }) => {
    await page.goto("/saude?bairro=uv-10")
    await page.getByRole("tab", { name: "Tabela" }).click()
    await expect(
      page.getByRole("region", { name: "Casos por bairro" })
    ).toBeVisible()
    await page
      .getByRole("button", { name: "Como os números são calculados" })
      .click()
    await expect(page.getByText("anual", { exact: true })).toBeVisible()

    expect(await larguraDaPagina(page)).toBeLessThanOrEqual(360)
  })

  test("o assistente e a lista de datasets não rolam na horizontal", async ({
    page,
  }) => {
    await entrarPelaApi(page, ANALISTA)
    await page.goto("/saude/importar")
    expect(await larguraDaPagina(page)).toBeLessThanOrEqual(360)

    await enviarArquivo(
      page,
      "saude-roteiro_DEMO.csv",
      bytesSinteticos("saude-roteiro_DEMO.csv")
    )
    await expect(
      page.getByRole("heading", { name: "Colunas do arquivo" })
    ).toBeVisible()
    expect(await larguraDaPagina(page)).toBeLessThanOrEqual(360)

    await page.goto("/saude/datasets")
    await expect(page.getByRole("table")).toBeVisible()
    expect(await larguraDaPagina(page)).toBeLessThanOrEqual(360)
  })
})
