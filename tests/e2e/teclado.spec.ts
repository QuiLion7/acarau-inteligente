import { ANALISTA } from "./acesso-helpers"
import { expect, test } from "./fixtures"
import { focoAtual, tabAte } from "./teclado-helpers"

test.describe("só teclado", () => {
  test("do topo ao botão Entrar, na ordem lógica e com foco visível, e Enter entra", async ({
    page,
  }) => {
    await page.goto("/entrar")
    // O menu chega por streaming (Suspense): sem esperar por ele, o Tab pode passar antes de existirem os links.
    await expect(
      page.getByRole("navigation", { name: "Módulos" })
    ).toBeVisible()

    const paradas = await tabAte(page, "Usuário")
    const nomes = paradas.map((parada) => parada.nome)
    expect(nomes[0]).toBe("Pular para o conteúdo")
    expect(nomes.indexOf("Território")).toBeGreaterThan(0)
    expect(nomes.indexOf("Fontes e limitações")).toBeGreaterThan(
      nomes.indexOf("Relatórios")
    )
    expect(nomes.indexOf("Usuário")).toBeGreaterThan(
      nomes.indexOf("Fontes e limitações")
    )
    expect(paradas.filter((parada) => !parada.focoVisivel)).toEqual([])

    await page.keyboard.type(ANALISTA.usuario)
    await page.keyboard.press("Tab")
    expect(await focoAtual(page)).toEqual({ nome: "Senha", focoVisivel: true })
    await page.keyboard.type(ANALISTA.senha)
    await page.keyboard.press("Tab")
    expect(await focoAtual(page)).toEqual({ nome: "Entrar", focoVisivel: true })

    await page.keyboard.press("Enter")

    await expect(page.getByRole("banner")).toContainText(
      "Analista Demo · Analista"
    )
  })

  test("busca, seleção, ficha e tabela de escolas só com o teclado, com foco visível e sem usar o mapa", async ({
    page,
  }) => {
    await page.goto("/territorio")
    await expect(
      page.getByRole("navigation", { name: "Módulos" })
    ).toBeVisible()

    await tabAte(page, "Buscar bairro")
    await page.keyboard.type("sao benedito")
    await page.keyboard.press("Tab")
    const resultado = await focoAtual(page)
    expect(resultado.nome).toContain("São Benedito")
    expect(resultado.focoVisivel).toBe(true)
    await page.keyboard.press("Enter")

    await expect(page).toHaveURL(/bairro=uv-03$/)
    await expect(
      page.getByRole("article").getByRole("heading", { name: "São Benedito" })
    ).toBeVisible()

    // O botão da lista sai da tela ao selecionar (abre a ficha) e o foco recomeça perto dele: a aba selecionada
    // fica antes, então volta-se com Shift+Tab. Na lista de abas só a selecionada recebe Tab; as outras vêm pelas setas.
    const voltando = await tabAte(page, "Ficha do bairro", "Shift+Tab")
    expect(voltando.at(-1)?.focoVisivel).toBe(true)
    await page.keyboard.press("ArrowRight")
    expect(await focoAtual(page)).toEqual({
      nome: "Escolas",
      focoVisivel: true,
    })
    await page.keyboard.press("Enter")
    await expect(
      page.getByRole("heading", { name: "Escolas de São Benedito" })
    ).toBeVisible()

    const paradas = await tabAte(page, "FRANCISCA ISAURA RIOS ROCHA EEIEF")
    expect(paradas.at(-1)?.focoVisivel).toBe(true)
    await page.keyboard.press("Enter")

    await expect(
      page.getByRole("article", { name: "FRANCISCA ISAURA RIOS ROCHA EEIEF" })
    ).toContainText("Situação de cobertura")
  })
})
