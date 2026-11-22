import type { Page } from "@playwright/test"

import { ANALISTA, entrarPelaApi, reiniciarDemo } from "./acesso-helpers"
import { expect, test } from "./fixtures"
import {
  aguardarMapaPronto,
  clicarNoPonto,
  obrasNoMapa,
  pontoInteriorDe,
} from "./mapa-helpers"

// Por atributo, não por papel: com a ficha aberta (modal) o resto da página sai da árvore de acessibilidade.
const mapaDeObras = (page: Page) =>
  page.locator(
    '[role="region"][aria-label="Mapa das obras por bairro de Acaraú"]'
  )
const cartao = (page: Page, nome: string) =>
  page.getByRole("group", { name: nome, exact: true })
const listaDeObras = (page: Page) =>
  page.getByRole("region", { name: "Lista de obras" })
const linhaDaObra = (page: Page, titulo: string) =>
  page.locator("tr", { has: page.locator("button", { hasText: titulo }) })
const formulario = (page: Page, nome: string) =>
  page.getByRole("form", { name: nome })

async function valorDoCartao(page: Page, nome: string) {
  return (await cartao(page, nome).locator("p").textContent()) ?? ""
}

async function abrirNovaObra(page: Page) {
  await page.getByRole("button", { name: "Nova obra" }).click()
  await expect(
    page.getByRole("heading", { name: "Nova obra", level: 3 })
  ).toBeFocused()
}

test.beforeEach(async ({ page }) => {
  await reiniciarDemo()
  await entrarPelaApi(page, ANALISTA)
  await page.goto("/obras")
  await aguardarMapaPronto(mapaDeObras(page))
  // Marca a página: se ela recarregar, a marca some e o teste de "sem recarregar" falha.
  await page.evaluate(() => {
    ;(window as unknown as { semRecarga: boolean }).semRecarga = true
  })
})

const naoRecarregou = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { semRecarga?: boolean }).semRecarga === true
  )

test.describe("Obras: o analista cadastra e edita (E2E-02)", () => {
  test("cria obra com um clique no Centro: marcador, resumo e lista mudam sem recarregar a página", async ({
    page,
  }) => {
    expect(await valorDoCartao(page, "Planejada")).toBe("3")
    expect(await obrasNoMapa(mapaDeObras(page))).toHaveLength(7)

    await abrirNovaObra(page)
    await formulario(page, "Nova obra")
      .getByLabel("Título")
      .fill("DEMO - Obra do analista")
    await clicarNoPonto(mapaDeObras(page), pontoInteriorDe("uv-10"))
    await expect(
      formulario(page, "Nova obra").getByText("Bairro calculado: Centro")
    ).toBeVisible()
    await page.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText("Obra salva")).toBeVisible()
    await expect(
      listaDeObras(page).getByRole("button", {
        name: "DEMO - Obra do analista",
      })
    ).toBeVisible()
    await expect(
      linhaDaObra(page, "DEMO - Obra do analista").getByRole("cell", {
        name: "Centro",
      })
    ).toBeVisible()
    await expect(cartao(page, "Planejada").locator("p")).toHaveText("4")
    await expect(cartao(page, "Total de obras").locator("p")).toHaveText("9")
    await expect
      .poll(async () => (await obrasNoMapa(mapaDeObras(page))).length)
      .toBe(8)
    await expect(linhaDaObra(page, "DEMO - Obra do analista")).toHaveAttribute(
      "aria-current",
      "true"
    )
    await expect(page.getByRole("button", { name: "Nova obra" })).toBeFocused()
    expect(await naoRecarregou(page)).toBe(true)
  })

  test("cria obra por coordenadas fora das UVs: fica fora da cobertura dos bairros e aparece no mapa", async ({
    page,
  }) => {
    await abrirNovaObra(page)
    const form = formulario(page, "Nova obra")
    await form.getByLabel("Título").fill("DEMO - Obra fora dos bairros")
    await form.getByLabel("Latitude").fill("-2,88")
    await form.getByLabel("Longitude").fill("-40,14")
    await expect(
      form.getByText("Bairro calculado: Fora da cobertura dos bairros")
    ).toBeVisible()

    await page.getByRole("button", { name: "Salvar" }).click()

    await expect(
      linhaDaObra(page, "DEMO - Obra fora dos bairros").getByRole("cell", {
        name: "Fora da cobertura dos bairros",
      })
    ).toBeVisible()
    await expect
      .poll(async () => (await obrasNoMapa(mapaDeObras(page))).length)
      .toBe(8)
  })

  test("cria obra sem localização: entra na lista e no resumo e o mapa não ganha marcador", async ({
    page,
  }) => {
    expect(await valorDoCartao(page, "Sem localização")).toBe("1")

    await abrirNovaObra(page)
    await formulario(page, "Nova obra")
      .getByLabel("Título")
      .fill("DEMO - Obra sem ponto")
    await page.getByRole("button", { name: "Salvar" }).click()

    await expect(
      linhaDaObra(page, "DEMO - Obra sem ponto").getByRole("cell", {
        name: "Sem localização",
      })
    ).toBeVisible()
    await expect(cartao(page, "Sem localização").locator("p")).toHaveText("2")
    expect(await obrasNoMapa(mapaDeObras(page))).toHaveLength(7)
  })

  test("ponto fora do município mostra o erro no grupo Localização e não deixa salvar", async ({
    page,
  }) => {
    await abrirNovaObra(page)
    const form = formulario(page, "Nova obra")
    await form.getByLabel("Título").fill("DEMO - Obra fora do município")

    await form.getByLabel("Latitude").fill("-3,7")
    await form.getByLabel("Longitude").fill("-38,5")

    await expect(
      form
        .getByRole("group", { name: "Localização" })
        .getByText("O ponto está fora do município de Acaraú")
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Salvar" })).toBeDisabled()
    await expect(
      listaDeObras(page).getByRole("button", {
        name: "DEMO - Obra fora do município",
      })
    ).toHaveCount(0)
  })

  test("o clique no mapa também recusa o ponto fora do município e o erro some ao voltar para dentro", async ({
    page,
  }) => {
    await abrirNovaObra(page)
    const form = formulario(page, "Nova obra")
    await form.getByLabel("Latitude").fill("-3,7")
    await form.getByLabel("Longitude").fill("-38,5")
    await expect(
      form.getByText("O ponto está fora do município de Acaraú")
    ).toBeVisible()

    await clicarNoPonto(mapaDeObras(page), pontoInteriorDe("uv-03"))

    await expect(
      form.getByText("O ponto está fora do município de Acaraú")
    ).toHaveCount(0)
    await expect(form.getByText("Bairro calculado: São Benedito")).toBeVisible()
  })

  test("edita a obra do roteiro para em andamento e vê a entrada nova no histórico", async ({
    page,
  }) => {
    await listaDeObras(page)
      .getByRole("button", { name: "DEMO - Requalificação de praça" })
      .click()
    const ficha = page.getByRole("dialog", { name: "Ficha da obra" })
    await ficha.getByRole("button", { name: "Editar obra" }).click()

    await expect(ficha).toBeHidden()
    await expect(
      page.getByRole("heading", { name: "Editar obra", level: 3 })
    ).toBeFocused()
    await expect(
      formulario(page, "Editar obra").getByLabel("Título")
    ).toHaveValue("DEMO - Requalificação de praça")
    await formulario(page, "Editar obra")
      .getByRole("radio", { name: "Em andamento" })
      .click()
    await page.getByRole("button", { name: "Salvar" }).click()

    await expect(page.getByText("Obra salva")).toBeVisible()
    await expect(
      linhaDaObra(page, "DEMO - Requalificação de praça").getByText(
        "Em andamento"
      )
    ).toBeVisible()
    await expect(cartao(page, "Em andamento").locator("p")).toHaveText("4")
    await expect(cartao(page, "Planejada").locator("p")).toHaveText("2")
    await expect(
      listaDeObras(page).getByRole("button", {
        name: "DEMO - Requalificação de praça",
      })
    ).toBeFocused()

    await listaDeObras(page)
      .getByRole("button", { name: "DEMO - Requalificação de praça" })
      .click()
    const fichaAtualizada = page.getByRole("dialog", { name: "Ficha da obra" })
    const historico = fichaAtualizada.getByRole("region", {
      name: "Histórico de situação",
    })
    await expect(historico.getByRole("listitem").first()).toContainText(
      "Situação alterada de Planejada para Em andamento"
    )
    await expect(historico.getByRole("listitem").first()).toContainText(
      ANALISTA.nome
    )
    await expect(historico.getByRole("listitem").last()).toContainText(
      "Obra criada como Planejada"
    )
    expect(await naoRecarregou(page)).toBe(true)
  })

  test("trocar o ponto da obra para outro bairro e remover a localização muda o bairro e tira o marcador", async ({
    page,
  }) => {
    await listaDeObras(page)
      .getByRole("button", { name: "DEMO - Requalificação de praça" })
      .click()
    await page
      .getByRole("dialog", { name: "Ficha da obra" })
      .getByRole("button", { name: "Editar obra" })
      .click()

    await clicarNoPonto(mapaDeObras(page), pontoInteriorDe("uv-06"))
    await page.getByRole("button", { name: "Salvar" }).click()
    await expect(
      linhaDaObra(page, "DEMO - Requalificação de praça").getByRole("cell", {
        name: "Paulo VI",
      })
    ).toBeVisible()

    await linhaDaObra(page, "DEMO - Requalificação de praça")
      .getByRole("button")
      .click()
    await page
      .getByRole("dialog", { name: "Ficha da obra" })
      .getByRole("button", { name: "Editar obra" })
      .click()
    await page.getByRole("button", { name: "Remover localização" }).click()
    await page.getByRole("button", { name: "Salvar" }).click()

    await expect(
      linhaDaObra(page, "DEMO - Requalificação de praça").getByRole("cell", {
        name: "Sem localização",
      })
    ).toBeVisible()
    await expect
      .poll(async () => (await obrasNoMapa(mapaDeObras(page))).length)
      .toBe(6)
  })

  test("cancelar o formulário volta à lista sem salvar nada", async ({
    page,
  }) => {
    await abrirNovaObra(page)
    await formulario(page, "Nova obra")
      .getByLabel("Título")
      .fill("DEMO - Descartada")

    await page.getByRole("button", { name: "Cancelar" }).click()

    await expect(
      page.getByRole("heading", { name: "Lista de obras" })
    ).toBeVisible()
    await expect(
      listaDeObras(page).getByRole("button", { name: "DEMO - Descartada" })
    ).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Nova obra" })).toBeFocused()
  })
})

test.describe("Obras: sessão expirada (CA-04.21)", () => {
  // O Chromium registra no console o 401 da própria requisição; é o único erro esperado neste caso.
  test.use({ errosDeConsolePermitidos: [/status of 401/] })

  test("ao salvar sem sessão mostra o aviso com o link de login e mantém o digitado", async ({
    page,
  }) => {
    await abrirNovaObra(page)
    await formulario(page, "Nova obra")
      .getByLabel("Título")
      .fill("DEMO - Obra sem sessão")
    // A sessão acaba no servidor (cookie apagado) enquanto o formulário está aberto.
    await page.context().clearCookies()

    await page.getByRole("button", { name: "Salvar" }).click()

    await expect(
      page.getByText(/Sua sessão expirou. Entre novamente para salvar./)
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Entrar novamente" })
    ).toHaveAttribute("href", "/entrar?motivo=expirada&retorno=%2Fobras")
    await expect(
      formulario(page, "Nova obra").getByLabel("Título")
    ).toHaveValue("DEMO - Obra sem sessão")
  })
})
