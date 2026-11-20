"use client"

import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"

import { EstadoInterface } from "@/components/estados/estado-interface"
import { comFiltros, lerFiltros } from "@/lib/filtros/filtros-url"
import type { DadosMapaResumo } from "@/lib/territorio/artefato-schema"

// Mesmo mapa do Território, em modo `resumo` (RF-01.25); fora do carregamento inicial pelo mesmo motivo.
const MapaTerritorio = dynamic(
  () =>
    import("@/components/territorio/mapa-territorio").then(
      (modulo) => modulo.MapaTerritorio
    ),
  {
    ssr: false,
    loading: () => (
      <EstadoInterface tipo="carregando" titulo="Carregando o mapa" />
    ),
  }
)

// Clicar num bairro leva ao Território com ele selecionado; o `periodo` já escolhido acompanha (DV-12).
export function MapaResumo({ bairros, limite }: DadosMapaResumo) {
  const router = useRouter()
  const filtros = lerFiltros(useSearchParams())

  function handleSelecionar(idBairro: string) {
    router.push(comFiltros("/territorio", { ...filtros, bairro: idBairro }))
  }

  return (
    <MapaTerritorio
      modo="resumo"
      bairros={bairros}
      limite={limite}
      onSelecionar={handleSelecionar}
    />
  )
}
