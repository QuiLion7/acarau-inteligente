import { expect, test } from "./fixtures"

test.describe("fontes e limitações", () => {
  test("informa que nenhuma camada de dados foi carregada, sem listar escola nem bairro", async ({
    page,
  }) => {
    await page.goto("/fontes")

    const conteudo = page.locator("#conteudo")
    await expect(
      conteudo.getByRole("heading", {
        name: "Nenhuma camada de dados foi carregada ainda",
      })
    ).toBeVisible()
    await expect(conteudo.getByRole("listitem")).toHaveCount(0)
    await expect(conteudo).not.toContainText(/escola|bairro/i)
  })

  test("a faixa de contexto leva a Fontes e limitações", async ({ page }) => {
    await page.goto("/obras")

    await page
      .getByRole("region", { name: "Contexto da consulta" })
      .getByRole("link", { name: "Fontes e limitações" })
      .click()

    await expect(page).toHaveURL(/\/fontes$/)
  })
})
