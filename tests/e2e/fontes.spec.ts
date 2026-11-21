import { expect, test } from "./fixtures"

test.describe("fontes e limitações", () => {
  test("lista as 4 camadas com etiqueta, versão, data de referência e limitações, sem lagoas nem distritos", async ({
    page,
  }) => {
    await page.goto("/fontes")

    const conteudo = page.locator("#conteudo")
    // Os cartões das camadas são os que têm etiqueta; os datasets publicados (PA-02.04) vêm em seção própria.
    const cartoes = conteudo
      .getByRole("article")
      .filter({ hasText: "Etiqueta:" })
    await expect(cartoes).toHaveCount(4)
    await expect(cartoes.getByRole("heading", { level: 2 })).toHaveText([
      "Bairros (Unidades de Vizinhança)",
      "Escolas",
      "Limite municipal",
      "Mapa base",
    ])
    for (const cartao of await cartoes.all()) {
      await expect(cartao).toContainText("Etiqueta:")
      await expect(cartao).toContainText("Versão:")
      await expect(cartao).toContainText("Data de referência:")
      await expect(cartao).toContainText("Limitações conhecidas")
    }
    await expect(
      cartoes.filter({ hasText: "Bairros (Unidades de Vizinhança)" })
    ).toContainText("Data de referência:Não informada")
    await expect(conteudo).not.toContainText(/lagoa|distrito/i)
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
