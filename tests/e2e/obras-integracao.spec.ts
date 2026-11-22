import { request as playwrightRequest, type Page } from "@playwright/test"

import {
  ADMINISTRADOR,
  ANALISTA,
  entrarPelaApi,
  entrarPelaInterface,
  reiniciarDemo,
} from "./acesso-helpers"
import { expect, test } from "./fixtures"
import { aguardarMapaPronto } from "./mapa-helpers"

const mapaDeObras = (page: Page) =>
  page.locator(
    '[role="region"][aria-label="Mapa das obras por bairro de Acaraú"]'
  )
const listaDeObras = (page: Page) =>
  page.getByRole("region", { name: "Lista de obras" })

test.beforeEach(async () => {
  await reiniciarDemo()
})

test.describe("Obras: Área do analista (E2E-04, CA-04.22)", () => {
  test("o atalho da Área do analista abre Obras com o formulário de nova obra, e fechar tira o parâmetro da URL", async ({
    page,
  }) => {
    await entrarPelaInterface(page, ANALISTA)
    await page.goto("/analista")

    await page.getByRole("link", { name: "Cadastrar obra" }).click()

    await expect(page).toHaveURL(/\/obras\?nova=1$/)
    await expect(
      page.getByRole("heading", { name: "Nova obra", level: 3 })
    ).toBeFocused()
    await expect(page.getByRole("form", { name: "Nova obra" })).toBeVisible()
    await aguardarMapaPronto(mapaDeObras(page))

    await page.getByRole("button", { name: "Cancelar" }).click()

    await expect(page).toHaveURL(/\/obras$/)
    await expect(page.getByRole("form")).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Nova obra" })).toBeFocused()
    await page.reload()
    await expect(page.getByRole("form")).toHaveCount(0)
  })

  test("o visitante em /obras?nova=1 não vê formulário nem botão de nova obra", async ({
    page,
  }) => {
    await page.goto("/obras?nova=1")

    await expect(
      page.getByRole("heading", { level: 1, name: "Obras" })
    ).toBeVisible()
    await expect(listaDeObras(page)).toBeVisible()
    await expect(page.getByRole("form")).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Nova obra" })).toHaveCount(0)
  })
})

test.describe("Obras: Fontes e reset (E2E-05, CA-04.23, CA-04.29, CA-04.18)", () => {
  test("Fontes e limitações mostra as obras com origem sintética, quantidade e última atualização", async ({
    page,
  }) => {
    await page.goto("/fontes")

    const secao = page.getByRole("region", { name: "Obras cadastradas" })
    await expect(secao).toContainText("SINTETICO")
    await expect(secao).toContainText(
      "Origem:Sintética: criadas na demonstração"
    )
    await expect(secao).toContainText("Quantidade:8 obras")
    await expect(secao).toContainText("Última atualização:15/11/2026 09:00")
    await expect(secao).toContainText("Não são obras municipais")
  })

  test("a Administração avisa que obras e históricos serão apagados, e depois do reset a obra criada some e as de exemplo voltam", async ({
    page,
  }) => {
    const origem = test.info().project.use.baseURL ?? ""
    const api = await playwrightRequest.newContext({ baseURL: origem })
    try {
      const login = await api.post("/api/auth/entrar", {
        data: { usuario: ANALISTA.usuario, senha: ANALISTA.senha },
        headers: { origin: origem },
      })
      expect(login.status()).toBe(200)
      const criada = await api.post("/api/obras", {
        data: {
          titulo: "DEMO - Obra que o reset apaga",
          situacao: "planejada",
        },
        headers: { origin: origem },
      })
      expect(criada.status()).toBe(201)
    } finally {
      await api.dispose()
    }
    await page.goto("/obras")
    await expect(
      listaDeObras(page).getByRole("button", {
        name: "DEMO - Obra que o reset apaga",
      })
    ).toBeVisible()
    await expect(page.getByText("Mostrando 9 obras.")).toBeVisible()

    await entrarPelaApi(page, ADMINISTRADOR)
    await page.goto("/admin")
    await page.getByRole("button", { name: "Reiniciar a demonstração" }).click()
    const dialogo = page.getByRole("alertdialog")
    await expect(dialogo).toContainText(
      "as obras cadastradas, com seus históricos"
    )
    await expect(dialogo).toContainText(
      "restaura o dataset e as obras de exemplo"
    )
    await dialogo.getByRole("button", { name: "Reiniciar" }).click()
    await expect(dialogo).toBeHidden()

    await page.goto("/obras")
    await expect(page.getByText("Mostrando 8 obras.")).toBeVisible()
    await expect(
      listaDeObras(page).getByRole("button", {
        name: "DEMO - Obra que o reset apaga",
      })
    ).toHaveCount(0)
    await expect(
      listaDeObras(page).getByRole("button", {
        name: "DEMO - Requalificação de praça",
      })
    ).toBeVisible()
  })

  test("o servidor não tem DELETE, PATCH nem GET em obras: respondem 405 (CA-04.20)", async ({
    page,
  }) => {
    await entrarPelaApi(page, ANALISTA)
    const origem = test.info().project.use.baseURL ?? ""
    const id = "6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f"

    const respostas = await Promise.all([
      page.request.delete(`/api/obras/${id}`, { headers: { origin: origem } }),
      page.request.patch(`/api/obras/${id}`, { headers: { origin: origem } }),
      page.request.get("/api/obras"),
      page.request.delete("/api/obras", { headers: { origin: origem } }),
    ])

    expect(respostas.map((resposta) => resposta.status())).toEqual([
      405, 405, 405, 405,
    ])
  })
})
