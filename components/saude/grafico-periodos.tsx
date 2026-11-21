"use client"

import { LineChart } from "echarts/charts"
import {
  AriaComponent,
  GridComponent,
  TooltipComponent,
} from "echarts/components"
import * as echarts from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import { useEffect, useMemo, useRef } from "react"

import { montarOpcaoGrafico, rotuloDosCasos } from "@/lib/saude/opcao-grafico"
import {
  montarSerieTemporal,
  type PontoSerie,
} from "@/lib/saude/serie-temporal"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"
import { flexionar } from "@/lib/territorio/formato"
import type { SerieSaude } from "@/lib/validations/datasets-schema"

// Só o que o gráfico usa entra no bundle (DV-29, R-07): linha, grade, dica, descrição para leitor de tela e canvas.
echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  AriaComponent,
  CanvasRenderer,
])

type GraficoPeriodosProps = {
  serie: SerieSaude
  /** `null` = todos os bairros: a soma dos que têm dado em cada período. */
  bairro: BairroResumo | null
  unidade: string
}

function Linhas({
  pontos,
  rotulo,
  unidade,
}: {
  pontos: readonly PontoSerie[]
  rotulo: string
  unidade: string
}) {
  const recipienteRef = useRef<HTMLDivElement>(null)
  const graficoRef = useRef<echarts.ECharts | null>(null)
  const opcao = useMemo(
    () => montarOpcaoGrafico(pontos, { serie: rotulo, unidade }),
    [pontos, rotulo, unidade]
  )

  // O efeito sincroniza o React com um sistema externo (o canvas do ECharts): cria, acompanha o tamanho e remove.
  useEffect(() => {
    const recipiente = recipienteRef.current
    if (!recipiente) return
    const grafico = echarts.init(recipiente)
    graficoRef.current = grafico
    const observador = new ResizeObserver(() => grafico.resize())
    observador.observe(recipiente)
    return () => {
      observador.disconnect()
      grafico.dispose()
      graficoRef.current = null
    }
  }, [])

  useEffect(() => {
    graficoRef.current?.setOption(opcao, true)
  }, [opcao])

  return (
    <div
      ref={recipienteRef}
      role="img"
      aria-label={`Gráfico de linha: ${rotulo}, por período`}
      className="h-64 w-full"
    />
  )
}

// Gráfico por período (RF-02.38, CA-02.26): a série do bairro selecionado, ou a soma dos bairros com dados em cada
// período com a contagem dos que entraram. Com um período só não há o que comparar: o texto toma o lugar do gráfico.
// A lista de valores abaixo é a alternativa em texto do gráfico (RN-023).
export function GraficoPeriodos({
  serie,
  bairro,
  unidade,
}: GraficoPeriodosProps) {
  const pontos = useMemo(
    () => montarSerieTemporal(serie, bairro?.id ?? null),
    [serie, bairro]
  )
  const rotulo = bairro ? bairro.nome : "Soma dos bairros com dados"

  return (
    <section aria-labelledby="titulo-grafico" className="flex flex-col gap-3">
      <h3 id="titulo-grafico" className="text-lg font-semibold">
        {bairro ? `Casos por período: ${bairro.nome}` : "Casos por período"}
      </h3>
      {pontos.length < 2 ? (
        <p>
          O dataset tem um período só
          {pontos[0] ? ` (${pontos[0].periodo})` : ""}: o gráfico por período
          precisa de dois ou mais.
        </p>
      ) : (
        <>
          <Linhas pontos={pontos} rotulo={rotulo} unidade={unidade} />
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {pontos.map(({ periodo, casos, bairrosComDados }) => (
              <li key={periodo}>
                <span className="font-medium">{periodo}:</span>{" "}
                {rotuloDosCasos(casos)}
                {bairro === null && casos !== null
                  ? ` (${flexionar(bairrosComDados, "bairro", "bairros")})`
                  : ""}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
