// Opção do gráfico de períodos (TechSpec EP-02 §4.4, RF-02.38): só dados e texto, sem tocar na biblioteca, para ter
// teste. Período sem dado é `null`: o ECharts deixa a lacuna e não interpola (`connectNulls: false`).
import type { EChartsCoreOption } from "echarts/core"

import type { PontoSerie } from "@/lib/saude/serie-temporal"
import { CORES_COROPLETICO } from "@/lib/territorio/estilo-mapa"

const COR_DA_SERIE = CORES_COROPLETICO[4]
const formatadorDeNumero = new Intl.NumberFormat("pt-BR")

/** "42 casos", "1 caso" ou "sem dados": a lacuna nunca vira número. */
export function rotuloDosCasos(casos: number | null): string {
  if (casos === null) return "sem dados"
  return `${formatadorDeNumero.format(casos)} ${casos === 1 ? "caso" : "casos"}`
}

type Rotulos = { serie: string; unidade: string }

function descreverSerie(pontos: readonly PontoSerie[], serie: string): string {
  const valores = pontos
    .map(({ periodo, casos }) => `${periodo}: ${rotuloDosCasos(casos)}`)
    .join("; ")
  return `Gráfico de linha: ${serie}, por período. ${valores}.`
}

export function montarOpcaoGrafico(
  pontos: readonly PontoSerie[],
  { serie, unidade }: Rotulos
): EChartsCoreOption {
  return {
    // Sem animação: o gráfico aparece pronto e não depende de preferência de movimento do sistema.
    animation: false,
    // O texto automático do ECharts é em inglês: a descrição para leitor de tela vem daqui, em pt-BR.
    aria: {
      enabled: true,
      label: { description: descreverSerie(pontos, serie) },
    },
    tooltip: {
      trigger: "axis",
      valueFormatter: (valor: unknown) =>
        rotuloDosCasos(typeof valor === "number" ? valor : null),
    },
    grid: { left: 48, right: 24, top: 24, bottom: 32 },
    xAxis: { type: "category", data: pontos.map(({ periodo }) => periodo) },
    yAxis: {
      type: "value",
      name: unidade,
      min: 0,
      minInterval: 1,
      axisLabel: {
        formatter: (valor: number) => formatadorDeNumero.format(valor),
      },
    },
    series: [
      {
        type: "line",
        name: serie,
        data: pontos.map(({ casos }) => casos),
        connectNulls: false,
        symbolSize: 8,
        lineStyle: { width: 2, color: COR_DA_SERIE },
        itemStyle: { color: COR_DA_SERIE },
      },
    ],
  }
}
