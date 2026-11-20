import type { Page } from "@playwright/test"

import { ADMINISTRADOR, entrarPelaApi } from "./acesso-helpers"
import { expect, test } from "./fixtures"
import { aguardarMapaPronto } from "./mapa-helpers"
import {
  ERRO_DE_CONSOLE_DO_404,
  ROTA_INEXISTENTE,
  ROTAS_LOGADAS,
  ROTAS_PUBLICAS,
} from "./rotas-teste"

// O visitante tem 5 itens no menu; o administrador, 7 (mais a área do analista e a administração).
function testarRotaEm360px(rota: string, itensDoMenu = 5) {
  test(`${rota}: sem rolagem horizontal e menu aberto por botão`, async ({
    page,
  }) => {
    await page.goto(rota)

    const largura = await page.evaluate(
      () => document.documentElement.scrollWidth
    )
    expect(largura).toBeLessThanOrEqual(360)
    await expect(page.getByRole("navigation", { name: "Módulos" })).toBeHidden()

    await page.getByRole("button", { name: "Abrir menu" }).click()

    await expect(
      page.getByRole("navigation", { name: "Módulos" }).getByRole("link")
    ).toHaveCount(itensDoMenu)
  })
}

test.describe("360 px", () => {
  test.use({ viewport: { width: 360, height: 740 } })

  for (const rota of ROTAS_PUBLICAS) testarRotaEm360px(rota)

  test.describe("rotas logadas", () => {
    test.beforeEach(async ({ page }) => {
      await entrarPelaApi(page, ADMINISTRADOR)
    })

    for (const rota of ROTAS_LOGADAS) testarRotaEm360px(rota, 7)
  })

  test.describe("rota inexistente", () => {
    test.use({ errosDeConsolePermitidos: [ERRO_DE_CONSOLE_DO_404] })

    testarRotaEm360px(ROTA_INEXISTENTE)
  })
})

test.describe("360 px com o mapa", () => {
  test.use({ viewport: { width: 360, height: 740 } })

  const larguraDaPagina = (page: Page) =>
    page.evaluate(() => document.documentElement.scrollWidth)

  test("Território com o mapa pronto e a tabela de escolas aberta não rola na horizontal", async ({
    page,
  }) => {
    await page.goto("/territorio?bairro=uv-10")
    await aguardarMapaPronto(
      page.getByRole("region", { name: "Mapa dos bairros de Acaraú" })
    )
    await page.getByRole("tab", { name: "Escolas" }).click()
    await expect(
      page.getByRole("heading", { name: "Escolas de Centro" })
    ).toBeVisible()

    expect(await larguraDaPagina(page)).toBeLessThanOrEqual(360)
  })

  test("Início com o mapa resumido pronto não rola na horizontal", async ({
    page,
  }) => {
    await page.goto("/")
    await aguardarMapaPronto(
      page.getByRole("region", { name: "Mapa resumido dos bairros de Acaraú" })
    )

    expect(await larguraDaPagina(page)).toBeLessThanOrEqual(360)
  })
})
