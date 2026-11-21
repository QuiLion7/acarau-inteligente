"use client"

import dynamic from "next/dynamic"

import { EstadoInterface } from "@/components/estados/estado-interface"

// O ECharts só roda no navegador e pesa (R-07): fica fora do carregamento inicial, como o mapa (DV-29, react-next §8).
// `ssr: false` só vale em Client Component, por isso o wrapper tem o próprio arquivo.
export const GraficoPeriodosDinamico = dynamic(
  async () => {
    const modulo = await import("@/components/saude/grafico-periodos")
    return modulo.GraficoPeriodos
  },
  {
    ssr: false,
    loading: () => (
      <EstadoInterface tipo="carregando" titulo="Carregando o gráfico" />
    ),
  }
)
