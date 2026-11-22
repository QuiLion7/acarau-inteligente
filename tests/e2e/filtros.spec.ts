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

  test("EP-03 E2E-11: o bairro escolhido na Saúde vale na Educação e vice-versa, e o período é preservado", async ({
    page,
  }) => {
    const menu = page.getByRole("navigation", { name: "Módulos" })
    const seletor = page.getByRole("combobox", { name: "Bairro" })
    await page.goto("/saude?periodo=2025")

    await seletor.fill("centro")
    await page.getByRole("option", { name: "Centro (UV 10)" }).click()
    await expect(page).toHaveURL(/\/saude\?periodo=2025&bairro=uv-10$/)
    await menu.getByRole("link", { name: "Educação" }).click()

    await expect(page).toHaveURL(/\/educacao\?bairro=uv-10&periodo=2025$/)
    await expect(seletor).toHaveValue("Centro (UV 10)")
    await expect(
      page.getByRole("group", { name: "Escolas em Centro" })
    ).toContainText("8 escolas")

    await seletor.fill("rodagem")
    await page.getByRole("option", { name: "Rodagem (UV 13)" }).click()
    await expect(page).toHaveURL(/\/educacao\?bairro=uv-13&periodo=2025$/)
    await menu.getByRole("link", { name: "Saúde" }).click()

    await expect(page).toHaveURL(/\/saude\?bairro=uv-13&periodo=2025$/)
    await expect(seletor).toHaveValue("Rodagem (UV 13)")
    await expect(page.getByRole("combobox", { name: "Período" })).toContainText(
      "2025"
    )
  })
})
