// Filtros globais na URL (RF-00.14, DV-12). `lerFiltros` só normaliza texto; `resolverBairro` valida `bairro`
// contra os bairros carregados: o valor bruto da URL nunca é exibido nem usado como identificador.
import type { BairroResumo } from "@/lib/territorio/artefato-schema"

export const TODOS = "Todos"
const TAMANHO_MAXIMO = 80

export type Filtros = { bairro: string; periodo: string }

type FonteDeParametros = { get: (nome: string) => string | null }

function normalizar(valor: string | null): string {
  const limpo = (valor ?? "").trim().slice(0, TAMANHO_MAXIMO).trim()
  return limpo || TODOS
}

export type SelecaoBairro =
  | { tipo: "todos" }
  | { tipo: "bairro"; bairro: BairroResumo }
  | { tipo: "nao-reconhecido" }

export function lerFiltros(parametros: FonteDeParametros): Filtros {
  return {
    bairro: normalizar(parametros.get("bairro")),
    periodo: normalizar(parametros.get("periodo")),
  }
}

// Reaplica os filtros ao link, preservando o resto da URL; "Todos" não vai para a URL.
export function comFiltros(href: string, filtros: Filtros): string {
  const url = new URL(href, "http://localhost")
  for (const nome of ["bairro", "periodo"] as const) {
    if (filtros[nome] === TODOS) url.searchParams.delete(nome)
    else url.searchParams.set(nome, filtros[nome])
  }
  return `${url.pathname}${url.search}${url.hash}`
}

/** `bairro` da URL só vale se for o ID estável de um bairro carregado (`uv-NN`); qualquer outro texto não é reconhecido. */
export function resolverBairro(
  filtros: Filtros,
  bairros: readonly BairroResumo[]
): SelecaoBairro {
  if (filtros.bairro === TODOS) return { tipo: "todos" }
  const bairro = bairros.find((item) => item.id === filtros.bairro)
  return bairro ? { tipo: "bairro", bairro } : { tipo: "nao-reconhecido" }
}
