import { request as playwrightRequest, type Page } from "@playwright/test"

import {
  ADMINISTRADOR,
  ANALISTA,
  entrarPelaApi,
  entrarPelaInterface,
  reiniciarDemo,
} from "./acesso-helpers"
import { violacoesGraves } from "./acessibilidade-helpers"
import { expect, test } from "./fixtures"

const tabela = (page: Page) =>
  page.getByRole("region", { name: "Eventos de auditoria" })

// O analista cria e edita uma obra por um contexto de API à parte, para a navegação do teste seguir com o administrador.
async function criarEEditarObraComoAnalista(origem: string): Promise<void> {
  const api = await playwrightRequest.newContext({ baseURL: origem })
  try {
    const headers = { origin: origem }
    const login = await api.post("/api/auth/entrar", {
      data: { usuario: ANALISTA.usuario, senha: ANALISTA.senha },
      headers,
    })
    expect(login.status()).toBe(200)
    const criada = await api.post("/api/obras", {
      data: { titulo: "DEMO - Obra da auditoria", situacao: "planejada" },
      headers,
    })
    expect(criada.status()).toBe(201)
    const { id } = await criada.json()
    const editada = await api.put(`/api/obras/${id}`, {
      data: { titulo: "DEMO - Obra da auditoria", situacao: "em_andamento" },
      headers,
    })
    expect(editada.status()).toBe(200)
  } finally {
    await api.dispose()
  }
}

test.beforeEach(async () => {
  await reiniciarDemo()
})

test.describe("Auditoria (E2E-05, CA-05.15, CA-05.17, CA-05.18, CA-05.32)", () => {
  test("o administrador chega pela Administração, vê os eventos do mais recente ao mais antigo e a lista passa no axe", async ({
    page,
  }) => {
    await criarEEditarObraComoAnalista(test.info().project.use.baseURL ?? "")
    await entrarPelaInterface(page, ADMINISTRADOR)
    await page.goto("/admin")

    await page.getByRole("link", { name: "Auditoria" }).click()

    await expect(page).toHaveURL(/\/admin\/auditoria$/)
    await expect(
      page.getByRole("heading", { level: 1, name: "Auditoria" })
    ).toBeVisible()
    const linhas = tabela(page).getByRole("row")
    await expect(linhas.nth(1)).toContainText("Entrada com sucesso")
    await expect(tabela(page)).toContainText("Obra editada")
    await expect(tabela(page)).toContainText("Obra criada")
    await expect(tabela(page)).toContainText("Demo reiniciada")
    expect(await violacoesGraves(page)).toEqual([])
  })

  test("filtra por 'Obra editada', abre a obra pelo link do alvo e, com um período sem eventos, mostra o vazio e 'Limpar filtros'", async ({
    page,
  }) => {
    await criarEEditarObraComoAnalista(test.info().project.use.baseURL ?? "")
    await entrarPelaInterface(page, ADMINISTRADOR)
    await page.goto("/admin/auditoria")

    await page.getByRole("combobox", { name: "Tipo de evento" }).click()
    await page.getByRole("option", { name: "Obra editada" }).click()

    await expect(page).toHaveURL(/tipo=obra_editada/)
    const linhas = tabela(page).getByRole("row")
    await expect(linhas.nth(1)).toContainText("Obra editada")
    await expect(tabela(page)).not.toContainText("Entrada com sucesso")
    await page.getByRole("button", { name: "Mostrar detalhes" }).first().click()
    await expect(tabela(page)).toContainText("Situação alterada")

    await page.getByLabel("De", { exact: true }).fill("2020-01-01")
    await page.getByLabel("Até", { exact: true }).fill("2020-01-02")

    await expect(
      page.getByRole("heading", { name: "Nenhum evento com estes filtros" })
    ).toBeVisible()
    await page.getByRole("button", { name: "Limpar filtros" }).first().click()
    await expect(page).toHaveURL(/\/admin\/auditoria$/)
    await expect(tabela(page)).toBeVisible()

    await page.getByRole("combobox", { name: "Tipo de evento" }).click()
    await page.getByRole("option", { name: "Obra editada" }).click()
    await tabela(page)
      .getByRole("link", { name: /^Obra / })
      .first()
      .click()
    await expect(page).toHaveURL(/\/obras\?obra=/)
    await expect(page.getByRole("dialog")).toContainText(
      "DEMO - Obra da auditoria"
    )
  })

  test("depois do reset, o evento da obra criada continua e o alvo aparece como removido pelo reset", async ({
    page,
  }) => {
    await criarEEditarObraComoAnalista(test.info().project.use.baseURL ?? "")
    await reiniciarDemo()
    await entrarPelaInterface(page, ADMINISTRADOR)
    await page.goto("/admin/auditoria?tipo=obra_criada")

    await expect(tabela(page)).toContainText("removido pelo reset")
    await expect(
      tabela(page).getByRole("link", { name: /^Obra / })
    ).toHaveCount(0)
  })

  test("o analista recebe 'Sem permissão' e o visitante vai ao login, sem nenhum evento na tela", async ({
    page,
  }) => {
    await page.goto("/admin/auditoria")
    await expect(page).toHaveURL(/\/entrar/)
    await expect(page.getByText("Entrada com sucesso")).toHaveCount(0)

    await entrarPelaApi(page, ANALISTA)
    await page.goto("/admin/auditoria")

    await expect(
      page.getByRole("heading", { level: 1, name: "Sem permissão" })
    ).toBeVisible()
    await expect(
      page.getByRole("region", { name: "Eventos de auditoria" })
    ).toHaveCount(0)
    await expect(page.locator("#conteudo")).not.toContainText(
      "Entrada com sucesso"
    )
  })

  test("a rota de obras ignora um obra= que não existe", async ({ page }) => {
    await page.goto("/obras?obra=6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f")

    await expect(
      page.getByRole("heading", { level: 1, name: "Obras" })
    ).toBeVisible()
    await expect(page.getByRole("dialog")).toHaveCount(0)
  })
})
