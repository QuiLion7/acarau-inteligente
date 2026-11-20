// Filtros globais na URL (RF-00.14, DV-12). O valor só é texto aqui; o EP-01 passa a validar `bairro` contra os territórios.
export const TODOS = "Todos"
const TAMANHO_MAXIMO = 80

export type Filtros = { bairro: string; periodo: string }

type FonteDeParametros = { get: (nome: string) => string | null }

function normalizar(valor: string | null): string {
  const limpo = (valor ?? "").trim().slice(0, TAMANHO_MAXIMO).trim()
  return limpo || TODOS
}

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
