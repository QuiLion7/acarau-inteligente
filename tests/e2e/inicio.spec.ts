import AxeBuilder from "@axe-core/playwright"

import { expect, test } from "./fixtures"

test.describe("início", () => {
  test("o visitante abre / e vê nome, selo, menu com 5 módulos, faixa Todos e nenhum número de dado", async ({
    page,
  }) => {
    await page.goto("/")

    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR")
    const cabecalho = page.getByRole("banner")
    await expect(
      cabecalho.getByRole("link", { name: "Acaraú Inteligente" })
    ).toBeVisible()
    await expect(
      cabecalho.getByRole("link", { name: "Demonstração Independente" })
    ).toBeVisible()

    const menu = page.getByRole("navigation", { name: "Módulos" })
    await expect(menu.getByRole("link")).toHaveText([
      "Território",
      "Saúde",
      "Educação",
      "Obras",
      "Relatórios",
    ])

    const faixa = page.getByRole("region", { name: "Contexto da consulta" })
    await expect(faixa).toContainText("Município:")
    await expect(
      faixa.getByText("Bairro:").locator("xpath=following-sibling::dd")
    ).toHaveText("Todos")
    await expect(
      faixa.getByText("Período:").locator("xpath=following-sibling::dd")
    ).toHaveText("Todos")
    await expect(
      faixa.getByRole("link", { name: "Fontes e limitações" })
    ).toBeVisible()

    await expect(page.locator("#conteudo")).not.toContainText(/\d/)
  })

  test("não há tema escuro nem atalho que o alterne", async ({ page }) => {
    await page.goto("/")
    await page.keyboard.press("d")

    await expect(page.locator("html")).not.toHaveClass(/dark/)
  })

  test("não tem violação de acessibilidade séria ou crítica", async ({
    page,
  }) => {
    await page.goto("/")

    const { violations } = await new AxeBuilder({ page }).analyze()

    expect(
      violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      )
    ).toEqual([])
  })

  test("em 360 px não rola na horizontal e o menu abre por botão", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto("/")

    const larguraDoConteudo = await page.evaluate(
      () => document.documentElement.scrollWidth
    )
    expect(larguraDoConteudo).toBeLessThanOrEqual(360)
    await expect(page.getByRole("navigation", { name: "Módulos" })).toBeHidden()

    await page.getByRole("button", { name: "Abrir menu" }).click()

    await expect(
      page.getByRole("navigation", { name: "Módulos" }).getByRole("link")
    ).toHaveCount(5)
  })
})
