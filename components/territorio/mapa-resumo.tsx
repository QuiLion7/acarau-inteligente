"use client"

import { useRouter, useSearchParams } from "next/navigation"

import { MapaTerritorioDinamico } from "@/components/territorio/mapa-territorio-dinamico"
import { comFiltros, lerFiltros } from "@/lib/filtros/filtros-url"
import type { DadosMapaResumo } from "@/lib/territorio/artefato-schema"

// Clicar num bairro leva ao Território com ele selecionado; o `periodo` já escolhido acompanha (DV-12).
export function MapaResumo({ bairros, limite }: DadosMapaResumo) {
  const router = useRouter()
  const filtros = lerFiltros(useSearchParams())

  function handleSelecionar(idBairro: string) {
    router.push(comFiltros("/territorio", { ...filtros, bairro: idBairro }))
  }

  return (
    <MapaTerritorioDinamico
      modo="resumo"
      bairros={bairros}
      limite={limite}
      onSelecionar={handleSelecionar}
    />
  )
}
