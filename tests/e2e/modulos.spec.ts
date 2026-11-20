import { expect, test } from "./fixtures"

test.describe("módulos ainda não entregues", () => {
  test("Saúde mostra disponível em breve, sem botão, gráfico nem número", async ({
    page,
  }) => {
    await page.goto("/saude")

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

  for (const rota of ["/educacao", "/obras", "/relatorios"]) {
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
