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

export type ResolucaoPeriodo =
  | { tipo: "padrao"; periodo: string }
  | { tipo: "periodo"; periodo: string }
  | { tipo: "sem-dados"; valor: string }

/**
 * `periodo` da URL contra os períodos do dataset (`periodos` em ordem crescente, como o repositório entrega): "Todos"
 * vale o mais recente; um período do dataset vale ele mesmo; qualquer outro texto é "período sem dados" e nunca é
 * exibido nem usado para escolher dado de outro período (RF-02.30, DV-27).
 */
export function resolverPeriodo(
  filtros: Filtros,
  periodos: readonly string[]
): ResolucaoPeriodo {
  if (filtros.periodo === TODOS) {
    const maisRecente = periodos.at(-1)
    return maisRecente === undefined
      ? { tipo: "sem-dados", valor: TODOS }
      : { tipo: "padrao", periodo: maisRecente }
  }
  return periodos.includes(filtros.periodo)
    ? { tipo: "periodo", periodo: filtros.periodo }
    : { tipo: "sem-dados", valor: filtros.periodo }
}
