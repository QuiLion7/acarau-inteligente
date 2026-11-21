import { expect, test } from "./fixtures"

// PA-02.01: a Saúde deixou de ser "em breve" no EP-02; Educação, Obras e Relatórios continuam (PA-02.07).
test.describe("módulos ainda não entregues", () => {
  test("Educação mostra disponível em breve, sem botão, gráfico nem número", async ({
    page,
  }) => {
    await page.goto("/educacao")

    const conteudo = page.locator("#conteudo")
    await expect(
      conteudo.getByRole("heading", { name: "Disponível em breve" })
    ).toBeVisible()
    await expect(conteudo.getByRole("button")).toHaveCount(0)
    await expect(
      conteudo.locator('canvas, svg:not([aria-hidden="true"]), [role="img"]')
    ).toHaveCount(0)
    await expect(conteudo).not.toContainText(/\d/)
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
