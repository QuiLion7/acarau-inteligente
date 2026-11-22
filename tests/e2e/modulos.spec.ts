import { expect, test } from "./fixtures"

// PA-02.01 e PA-03.06: a Saúde (EP-02) e a Educação (EP-03) deixaram de ser "em breve"; Obras e Relatórios continuam (PA-03.09).
test.describe("módulos ainda não entregues", () => {
  test("a Educação não é mais disponível em breve (PA-03.06)", async ({
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
  })

  test("a Saúde não é mais disponível em breve (PA-02.01)", async ({
    page,
  }) => {
    await page.goto("/saude")

    await expect(
      page.getByRole("heading", { level: 1, name: "Saúde" })
    ).toBeVisible()
    await expect(
      page.locator("#conteudo").getByRole("heading", {
        name: "Disponível em breve",
      })
    ).toHaveCount(0)
  })

  for (const rota of ["/obras", "/relatorios"]) {
    test(`${rota} também mostra disponível em breve`, async ({ page }) => {
      await page.goto(rota)

      await expect(
        page
          .locator("#conteudo")
          .getByRole("heading", { name: "Disponível em breve" })
      ).toBeVisible()
    })
  }
})
