"use client"

import dynamic from "next/dynamic"

import { EstadoInterface } from "@/components/estados/estado-interface"

// Ponto único de carga do mapa (DV-28): MapLibre só roda no navegador e pesa, então fica fora do carregamento
// inicial (react-next §8). `ssr: false` só vale em Client Component, por isso o wrapper tem o próprio arquivo.
export const MapaTerritorioDinamico = dynamic(
  async () => {
    const modulo = await import("@/components/territorio/mapa-territorio")
    return modulo.MapaTerritorio
  },
  {
    ssr: false,
    loading: () => (
      <EstadoInterface tipo="carregando" titulo="Carregando o mapa" />
    ),
  }
)
