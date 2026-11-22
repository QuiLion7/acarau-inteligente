import { expect, test } from "./fixtures"

// PA-02.01, PA-03.06 e PA-04.01: a Saúde (EP-02), a Educação (EP-03) e as Obras (EP-04) deixaram de ser "em breve"; Relatórios continua (PA-04.02).
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

  test("as Obras não são mais disponível em breve (PA-04.01)", async ({
    page,
  }) => {
    await page.goto("/obras")

    await expect(
      page.getByRole("heading", { level: 1, name: "Obras" })
    ).toBeVisible()
    await expect(
      page.locator("#conteudo").getByRole("heading", {
        name: "Disponível em breve",
      })
    ).toHaveCount(0)
  })

  test("os Relatórios continuam disponível em breve (PA-04.02)", async ({
    page,
  }) => {
    await page.goto("/relatorios")

    await expect(
      page
        .locator("#conteudo")
        .getByRole("heading", { name: "Disponível em breve" })
    ).toBeVisible()
  })
})
