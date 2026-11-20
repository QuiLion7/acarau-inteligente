import AxeBuilder from "@axe-core/playwright"

import { ADMINISTRADOR, entrarPelaApi } from "./acesso-helpers"
import { expect, test } from "./fixtures"
import {
  ERRO_DE_CONSOLE_DO_404,
  ROTA_INEXISTENTE,
  ROTAS_LOGADAS,
  ROTAS_PUBLICAS,
} from "./rotas-teste"

function testarRota(rota: string) {
  test(`${rota}: selo, aviso alcançável, sem violação séria de acessibilidade e console limpo`, async ({
    page,
  }) => {
    await page.goto(rota)

    const selo = page
      .getByRole("banner")
      .getByRole("link", { name: "Demonstração Independente" })
    await expect(selo).toBeVisible()
    await expect(selo).toHaveAttribute("href", "/sobre")

    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(
      violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical"
      )
    ).toEqual([])
  })
}

test.describe("rotas públicas", () => {
  for (const rota of ROTAS_PUBLICAS) testarRota(rota)

  test("o selo leva ao aviso completo de demonstração", async ({ page }) => {
    await page.goto("/saude")

    await page
      .getByRole("banner")
      .getByRole("link", { name: "Demonstração Independente" })
      .click()

    await expect(page).toHaveURL(/\/sobre$/)
    await expect(page.getByRole("main")).toContainText(
      "DEMONSTRAÇÃO INDEPENDENTE - dados de saúde e obras sintéticos; geometrias reconstruídas de documentos públicos; não constitui sistema oficial da Prefeitura."
    )
  })
})

test.describe("rotas logadas", () => {
  test.beforeEach(async ({ page }) => {
    await entrarPelaApi(page, ADMINISTRADOR)
  })

  for (const rota of ROTAS_LOGADAS) testarRota(rota)
})

test.describe("rota inexistente", () => {
  test.use({ errosDeConsolePermitidos: [ERRO_DE_CONSOLE_DO_404] })

  testarRota(ROTA_INEXISTENTE)

  test("mostra não encontrado em pt-BR, com status 404 e caminho de volta", async ({
    page,
  }) => {
    const resposta = await page.goto(ROTA_INEXISTENTE)

    expect(resposta?.status()).toBe(404)
    await expect(
      page.getByRole("heading", { level: 1, name: "Página não encontrada" })
    ).toBeVisible()
    await page.getByRole("link", { name: "Voltar ao início" }).click()
    await expect(page).toHaveURL(/\/$/)
  })
})
