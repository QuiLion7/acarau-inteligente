import { resolve } from "node:path"

import { expect, test as base } from "@playwright/test"

import { MAPA_BASE } from "../../lib/config/mapa-base"

type OpcoesDeConsole = {
  // Exceção explícita e temporária por arquivo de spec; o padrão é nenhum erro de console.
  errosDeConsolePermitidos: RegExp[]
}

type OpcoesDeMapa = {
  // `indisponivel` aborta as requisições do fundo OSM (E2E-04). Só nesse modo, e só para erro de console cuja URL
  // de origem é o host do fundo, o Chromium pode registrar "Failed to load resource" sem reprovar o teste (R-CONSOLE-REDE).
  mapaBase: "disponivel" | "indisponivel"
}

const TILE_NEUTRO = resolve(import.meta.dirname, "fixtures/tile.png")

type ErroDeConsole = { texto: string; origem: string }

function vemDoFundoDeMapa(erro: ErroDeConsole) {
  return erro.origem.includes(MAPA_BASE.hostTiles)
}

// Qualquer erro de console ou exceção da página falha o teste (RNF-00.06, test.md §13). Nenhum teste fala com a rede
// externa: os tiles do OSM são interceptados em todos (DV-22).
export const test = base.extend<OpcoesDeConsole & OpcoesDeMapa>({
  errosDeConsolePermitidos: [[], { option: true }],
  mapaBase: ["disponivel", { option: true }],
  page: async ({ page, errosDeConsolePermitidos, mapaBase }, usar) => {
    // No contexto, não na página: o teste que abre outra aba (E2E-03) também não fala com a rede externa.
    await page
      .context()
      .route(`https://${MAPA_BASE.hostTiles}/**`, (rota) =>
        mapaBase === "indisponivel"
          ? rota.abort()
          : rota.fulfill({ path: TILE_NEUTRO, contentType: "image/png" })
      )

    const erros: ErroDeConsole[] = []
    page.on("console", (mensagem) => {
      if (mensagem.type() !== "error") return
      erros.push({
        texto: mensagem.text(),
        origem: mensagem.location().url,
      })
    })
    page.on("pageerror", (erro) =>
      erros.push({ texto: erro.message, origem: "" })
    )

    await usar(page)

    const inesperados = erros.filter(
      (erro) =>
        !errosDeConsolePermitidos.some((padrao) => padrao.test(erro.texto)) &&
        !(mapaBase === "indisponivel" && vemDoFundoDeMapa(erro))
    )
    expect(
      inesperados.map(({ texto }) => texto),
      "erros de console durante o teste"
    ).toEqual([])
  },
})

export { expect }
