import type { Page } from "@playwright/test"

import { ANALISTA } from "./acesso-helpers"
import { expect, test } from "./fixtures"

type ParadaDoFoco = { nome: string; focoVisivel: boolean }

const LIMITE_DE_TABS = 40

// Nome de quem tem o foco e se há indicador de foco: contorno ou o anel (box-shadow) do design system.
async function focoAtual(page: Page): Promise<ParadaDoFoco> {
  return page.evaluate(() => {
    const elemento = document.activeElement
    if (!(elemento instanceof HTMLElement))
      return { nome: "", focoVisivel: false }
    const estilo = getComputedStyle(elemento)
    const comContorno =
      estilo.outlineStyle !== "none" && parseFloat(estilo.outlineWidth) > 0
    const rotulo =
      elemento instanceof HTMLInputElement
        ? elemento.labels?.[0]?.textContent
        : null
    return {
      nome: (rotulo ?? elemento.textContent ?? "").trim(),
      focoVisivel: comContorno || estilo.boxShadow !== "none",
    }
  })
}

// Tab até chegar ao alvo, devolvendo todas as paradas no caminho (inclusive o alvo).
async function tabAte(page: Page, alvo: string): Promise<ParadaDoFoco[]> {
  const paradas: ParadaDoFoco[] = []
  for (let tentativa = 0; tentativa < LIMITE_DE_TABS; tentativa++) {
    await page.keyboard.press("Tab")
    const parada = await focoAtual(page)
    paradas.push(parada)
    if (parada.nome === alvo) return paradas
  }
  throw new Error(
    `O foco não chegou a "${alvo}": ${paradas.map((p) => p.nome).join(" > ")}`
  )
}

test.describe("só teclado", () => {
  test("do topo ao botão Entrar, na ordem lógica e com foco visível, e Enter entra", async ({
    page,
  }) => {
    await page.goto("/entrar")

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
})
