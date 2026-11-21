"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  comFiltros,
  lerFiltros,
  resolverPeriodo,
  TODOS,
  type ResolucaoPeriodo,
} from "@/lib/filtros/filtros-url"

type FiltroPeriodo = {
  resolucao: ResolucaoPeriodo
  selecionar: (periodo: string) => void
  limpar: () => void
}

// O período vive só na URL (DV-12, DV-27), como o bairro: selecionar e limpar trocam o `periodo` e preservam o
// resto da consulta (inclusive `bairro` e `versao`). Só a Saúde usa, por isso a lista de períodos vem do dataset.
export function useFiltroPeriodo(periodos: readonly string[]): FiltroPeriodo {
  const router = useRouter()
  const pathname = usePathname()
  const parametros = useSearchParams()
  const filtros = lerFiltros(parametros)

  function trocarPeriodo(periodo: string) {
    const atual = parametros.toString()
    const destino = comFiltros(atual ? `${pathname}?${atual}` : pathname, {
      ...filtros,
      periodo,
    })
    router.replace(destino, { scroll: false })
  }

  return {
    resolucao: resolverPeriodo(filtros, periodos),
    selecionar: trocarPeriodo,
    limpar: () => trocarPeriodo(TODOS),
  }
}
