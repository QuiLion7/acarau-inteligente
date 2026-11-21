import type { Page } from "@playwright/test"

export type ParadaDoFoco = { nome: string; focoVisivel: boolean }

const LIMITE_DE_TABS = 40

// Nome de quem tem o foco e se há indicador de foco: contorno ou o anel (box-shadow) do design system.
export async function focoAtual(page: Page): Promise<ParadaDoFoco> {
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

// Tab (ou Shift+Tab) até chegar ao alvo, devolvendo todas as paradas no caminho (inclusive o alvo).
export async function tabAte(
  page: Page,
  alvo: string,
  tecla: "Tab" | "Shift+Tab" = "Tab"
): Promise<ParadaDoFoco[]> {
  const paradas: ParadaDoFoco[] = []
  for (let tentativa = 0; tentativa < LIMITE_DE_TABS; tentativa++) {
    await page.keyboard.press(tecla)
    const parada = await focoAtual(page)
    paradas.push(parada)
    if (parada.nome === alvo) return paradas
  }
  throw new Error(
    `O foco não chegou a "${alvo}": ${paradas.map((p) => p.nome).join(" > ")}`
  )
}
