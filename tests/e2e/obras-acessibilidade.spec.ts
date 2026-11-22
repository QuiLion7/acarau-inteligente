import AxeBuilder from "@axe-core/playwright"
import type { Page } from "@playwright/test"

import { ANALISTA, entrarPelaApi, reiniciarDemo } from "./acesso-helpers"
import { expect, test } from "./fixtures"
import { aguardarMapaPronto } from "./mapa-helpers"

async function violacoesGraves(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations.filter(
    ({ impact }) => impact === "serious" || impact === "critical"
  )
}

const mapaDeObras = (page: Page) =>
  page.locator(
    '[role="region"][aria-label="Mapa das obras por bairro de Acaraú"]'
  )
const listaDeObras = (page: Page) =>
  page.getByRole("region", { name: "Lista de obras" })

test.beforeEach(async () => {
  await reiniciarDemo()
})

test.describe("Obras: só teclado e acessibilidade (E2E-03, CA-04.25, RNF-04.01)", () => {
  test("o visitante filtra, abre a ficha pela lista e o foco volta à linha ao fechar", async ({
    page,
  }) => {
    await page.goto("/obras")
    await aguardarMapaPronto(mapaDeObras(page))

    const chip = page.getByRole("button", { name: "Suspensa" })
    await chip.focus()
    await page.keyboard.press("Space")
    await expect(chip).toHaveAttribute("aria-pressed", "true")
    await expect(page).toHaveURL(/situacao=suspensa/)
    await page.getByRole("button", { name: "Suspensa" }).press("Space")
    await expect(page).not.toHaveURL(/situacao=/)

    const botaoDaObra = listaDeObras(page).getByRole("button", {
      name: "DEMO - Requalificação de praça",
    })
    await botaoDaObra.focus()
    await page.keyboard.press("Enter")
    const ficha = page.getByRole("dialog", { name: "Ficha da obra" })
    await expect(ficha).toBeVisible()
    await page.keyboard.press("Escape")

    await expect(ficha).toBeHidden()
    await expect(botaoDaObra).toBeFocused()
  })

  test("o analista cadastra uma obra informando coordenadas, sem mouse, com o foco no título ao abrir", async ({
    page,
  }) => {
    await entrarPelaApi(page, ANALISTA)
    await page.goto("/obras")
    await aguardarMapaPronto(mapaDeObras(page))

    await page.getByRole("button", { name: "Nova obra" }).focus()
    await page.keyboard.press("Enter")
    await expect(
      page.getByRole("heading", { name: "Nova obra", level: 3 })
    ).toBeFocused()
    await page.keyboard.press("Tab")
    await expect(page.getByLabel("Título")).toBeFocused()
    await page.keyboard.type("DEMO - Obra por teclado")
    await page.getByLabel("Latitude").focus()
    await page.keyboard.type("-2,885116")
    await page.keyboard.press("Tab")
    await expect(page.getByLabel("Longitude")).toBeFocused()
    await page.keyboard.type("-40,118958")
    await expect(page.getByText("Bairro calculado: Centro")).toBeVisible()
    await page.getByRole("button", { name: "Salvar" }).focus()
    await page.keyboard.press("Enter")

    await expect(page.getByText("Obra salva")).toBeVisible()
    await expect(
      listaDeObras(page).getByRole("button", {
        name: "DEMO - Obra por teclado",
      })
    ).toBeVisible()
  })

  test("a página com a lista, a ficha aberta e o formulário aberto não tem violação grave de acessibilidade", async ({
    page,
  }) => {
    await entrarPelaApi(page, ANALISTA)
    await page.goto("/obras")
    await aguardarMapaPronto(mapaDeObras(page))
    expect(await violacoesGraves(page)).toEqual([])

    await listaDeObras(page)
      .getByRole("button", { name: "DEMO - Requalificação de praça" })
      .click()
    const ficha = page.getByRole("dialog", { name: "Ficha da obra" })
    await expect(ficha).toBeVisible()
    // O axe lê o contraste do que está na tela: espera a animação de entrada da ficha terminar (opacidade 1).
    await expect(ficha).toHaveCSS("opacity", "1")
    expect(await violacoesGraves(page)).toEqual([])

    await page.getByRole("button", { name: "Editar obra" }).click()
    await expect(
      page.getByRole("heading", { name: "Editar obra", level: 3 })
    ).toBeFocused()
    // O axe só roda com a ficha já fora do DOM: no meio da animação de saída o contraste lido é o da transição.
    await expect(page.getByRole("dialog")).toHaveCount(0)
    expect(await violacoesGraves(page)).toEqual([])

    await page.getByRole("button", { name: "Remover localização" }).click()
    await page.getByLabel("Latitude").fill("-3,7")
    await page.getByLabel("Longitude").fill("-38,5")
    await expect(
      page.getByText("O ponto está fora do município de Acaraú")
    ).toBeVisible()
    expect(await violacoesGraves(page)).toEqual([])
  })
})
