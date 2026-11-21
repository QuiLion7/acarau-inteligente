import AxeBuilder from "@axe-core/playwright"
import type { Page } from "@playwright/test"

import { expect, test } from "./fixtures"
import { aguardarMapaPronto, clicarNoPonto, ESCOLAS } from "./mapa-helpers"

const BAIRRO_FAIXA = "Bairro:"

const faixaDe = (page: Page) =>
  page.getByRole("region", { name: "Contexto da consulta" })
const bairroDaFaixa = (page: Page) =>
  faixaDe(page).getByText(BAIRRO_FAIXA).locator("xpath=following-sibling::dd")

async function violacoesGraves(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations.filter(
    ({ impact }) => impact === "serious" || impact === "critical"
  )
}

test.describe("jornada do Território", () => {
  test("roteiro de 0 a 2 minutos: Início, Território, busca, bairro, escolas, ficha e Fontes, com axe", async ({
    page,
  }) => {
    const escolaDeSaoBenedito = ESCOLAS.find(
      ({ nome }) => nome === "FRANCISCA ISAURA RIOS ROCHA EEIEF"
    )!

    await page.goto("/")
    await aguardarMapaPronto(
      page.getByRole("region", { name: "Mapa resumido dos bairros de Acaraú" })
    )
    expect(await violacoesGraves(page)).toEqual([])

    await page
      .getByRole("navigation", { name: "Módulos" })
      .getByRole("link", { name: "Território" })
      .click()
    await expect(page).toHaveURL(/\/territorio$/)
    const mapa = page.getByRole("region", {
      name: "Mapa dos bairros de Acaraú",
    })
    await aguardarMapaPronto(mapa)
    await expect(
      page.getByRole("region", { name: "Bairros da sede" }).getByRole("row")
    ).toHaveCount(25)
    await expect(page.getByRole("region", { name: "Legenda" })).toContainText(
      "24 bairros"
    )

    // As quatro ações do roteiro: busca, seleção do bairro, camada de escolas e ficha da escola.
    await page
      .getByRole("searchbox", { name: "Buscar bairro" })
      .fill("sao benedito")
    await page.getByRole("tabpanel").getByRole("button").click()
    await expect(bairroDaFaixa(page)).toHaveText("São Benedito")
    await page
      .getByRole("group", { name: "Camadas do mapa" })
      .getByText("Escolas")
      .click()
    await clicarNoPonto(mapa, escolaDeSaoBenedito.posicao!)
    await expect(
      page.getByRole("article", { name: escolaDeSaoBenedito.nome })
    ).toContainText(escolaDeSaoBenedito.codigoInep)
    expect(await violacoesGraves(page)).toEqual([])

    await faixaDe(page)
      .getByRole("link", { name: "Fontes e limitações" })
      .click()
    await expect(page).toHaveURL(/\/fontes/)
    // Os cartões das camadas são os que têm etiqueta; os datasets publicados (PA-02.04) vêm em seção própria.
    await expect(
      page
        .locator("#conteudo")
        .getByRole("article")
        .filter({ hasText: "Etiqueta:" })
    ).toHaveCount(4)
    expect(await violacoesGraves(page)).toEqual([])
  })

  test("o Centro persiste ao recarregar, em outra aba e ao trocar de módulo e voltar", async ({
    page,
  }) => {
    await page.goto("/territorio")
    await page
      .getByRole("tabpanel")
      .getByRole("button", { name: /Centro/ })
      .click()
    await expect(page).toHaveURL(/bairro=uv-10$/)

    await page.reload()
    await expect(bairroDaFaixa(page)).toHaveText("Centro")

    const outraAba = await page.context().newPage()
    await outraAba.goto(page.url())
    await expect(
      outraAba.getByRole("article").getByRole("heading", { name: "Centro" })
    ).toBeVisible()
    await outraAba.close()

    const menu = page.getByRole("navigation", { name: "Módulos" })
    await menu.getByRole("link", { name: "Saúde" }).click()
    await expect(page).toHaveURL(/\/saude\?bairro=uv-10$/)
    await expect(bairroDaFaixa(page)).toHaveText("Centro")
    await menu.getByRole("link", { name: "Território" }).click()
    await expect(page).toHaveURL(/\/territorio\?bairro=uv-10$/)
    await expect(
      page.getByRole("article").getByRole("heading", { name: "Centro" })
    ).toBeVisible()
  })
})
