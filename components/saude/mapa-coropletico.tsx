"use client"

import type { Map as MapaMapLibre } from "maplibre-gl"
import { useMemo } from "react"

import { MapaTerritorioDinamico } from "@/components/territorio/mapa-territorio-dinamico"
import type { AnalisePeriodo } from "@/lib/saude/analise-periodo"
import type { DadosMapaResumo } from "@/lib/territorio/artefato-schema"
import type { DadosCoropletico } from "@/lib/territorio/estilo-mapa"

type MapaCoropleticoProps = {
  mapa: DadosMapaResumo
  analise: AnalisePeriodo
  selecionadoId: string | null
  onSelecionar: (idBairro: string) => void
  /** Entrega o mapa MapLibre carregado (e `null` ao removê-lo), para o "Baixar mapa (PNG)" (RF-05.22). */
  aoCarregar?: (mapa: MapaMapLibre | null) => void
}

// O coroplético lê o mesmo `AnalisePeriodo` da legenda, do ranking e da tabela (CA-02.19): só a situação e a classe de
// cada bairro vão ao mapa, que as pinta sem ser recriado (DV-28). A tabela é a alternativa completa a ele (RN-023).
export function MapaCoropletico({
  mapa,
  analise,
  selecionadoId,
  onSelecionar,
  aoCarregar,
}: MapaCoropleticoProps) {
  const coropletico = useMemo<DadosCoropletico>(
    () =>
      Object.fromEntries(
        analise.bairros.map(({ bairro, situacao, classe }) => [
          bairro.id,
          { situacao, classe },
        ])
      ),
    [analise]
  )

  return (
    <MapaTerritorioDinamico
      modo="resumo"
      rotulo="Mapa dos casos por bairro de Acaraú"
      bairros={mapa.bairros}
      limite={mapa.limite}
      selecionadoId={selecionadoId}
      onSelecionar={onSelecionar}
      coropletico={coropletico}
      aoCarregar={aoCarregar}
    />
  )
}
