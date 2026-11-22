"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo } from "react"

import { comFiltros, lerFiltros, TODOS } from "@/lib/filtros/filtros-url"
import { escreverSituacoes, lerSituacoes } from "@/lib/obras/filtro-obras"
import type { SituacaoObra } from "@/lib/obras/situacao-obra"

const PARAMETRO_SITUACAO = "situacao"

type FiltroSituacao = {
  situacoes: SituacaoObra[]
  definir: (situacoes: readonly SituacaoObra[]) => void
  /** Tira a situação e o bairro de uma vez: duas trocas seguidas de URL se atropelam, cada uma sobre a URL antiga. */
  limparComBairro: () => void
}

// A situação das obras vive só na URL, como parâmetro local de Obras (DV-42, DEC-T-04): não entra em `Filtros`
// globais, para não viajar entre módulos. Escrever preserva o resto da consulta (inclusive `bairro`); nenhuma
// situação marcada tira o parâmetro. Modelo: `seletor-versao`.
export function useFiltroSituacao(): FiltroSituacao {
  const router = useRouter()
  const pathname = usePathname()
  const parametros = useSearchParams()
  const bruto = parametros.get(PARAMETRO_SITUACAO)
  const situacoes = useMemo(() => lerSituacoes(bruto), [bruto])

  function definir(novas: readonly SituacaoObra[]) {
    const proximos = new URLSearchParams(parametros)
    const valor = escreverSituacoes(novas)
    if (valor === null) proximos.delete(PARAMETRO_SITUACAO)
    else proximos.set(PARAMETRO_SITUACAO, valor)
    const consulta = proximos.toString()
    router.replace(consulta ? `${pathname}?${consulta}` : pathname, {
      scroll: false,
    })
  }

  function limparComBairro() {
    const proximos = new URLSearchParams(parametros)
    proximos.delete(PARAMETRO_SITUACAO)
    const consulta = proximos.toString()
    const destino = comFiltros(
      consulta ? `${pathname}?${consulta}` : pathname,
      {
        ...lerFiltros(parametros),
        bairro: TODOS,
      }
    )
    router.replace(destino, { scroll: false })
  }

  return { situacoes, definir, limparComBairro }
}
