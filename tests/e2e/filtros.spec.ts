import { expect, test } from "./fixtures"

test.describe("filtros globais na URL", () => {
  test("bairro e período sobrevivem à troca de módulo e ao recarregamento", async ({
    page,
  }) => {
    await page.goto("/saude?bairro=uv-10&periodo=2025")
    const faixa = page.getByRole("region", { name: "Contexto da consulta" })
    const valorDe = (rotulo: string) =>
      faixa.getByText(`${rotulo}:`).locator("xpath=following-sibling::dd")
    await expect(valorDe("Bairro")).toHaveText("Centro")
    await expect(valorDe("Período")).toHaveText("2025")

    await page
      .getByRole("navigation", { name: "Módulos" })
      .getByRole("link", { name: "Educação" })
      .click()
    await expect(page).toHaveURL(/\/educacao\?bairro=uv-10&periodo=2025$/)
    await page.reload()

    await expect(valorDe("Bairro")).toHaveText("Centro")
    await expect(valorDe("Período")).toHaveText("2025")
  })

  test("bairro em texto livre (EP-00) vira Não reconhecido na faixa, sem eco do valor", async ({
    page,
  }) => {
    await page.goto("/saude?bairro=Centro")

    const faixa = page.getByRole("region", { name: "Contexto da consulta" })
    await expect(
      faixa.getByText("Bairro:").locator("xpath=following-sibling::dd")
    ).toHaveText("Não reconhecido")
    await expect(faixa).not.toContainText("Centro")
  })

  test("sem filtro a faixa mostra Todos", async ({ page }) => {
    await page.goto("/educacao")

    const faixa = page.getByRole("region", { name: "Contexto da consulta" })
    await expect(
      faixa.getByText("Bairro:").locator("xpath=following-sibling::dd")
    ).toHaveText("Todos")
    await expect(
      faixa.getByText("Período:").locator("xpath=following-sibling::dd")
    ).toHaveText("Todos")
  })
})
