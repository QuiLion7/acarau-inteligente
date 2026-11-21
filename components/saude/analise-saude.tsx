"use client"

import { useMemo } from "react"

import { EstadoInterface } from "@/components/estados/estado-interface"
import { AcoesAnalista } from "@/components/saude/acoes-analista"
import { CabecalhoDataset } from "@/components/saude/cabecalho-dataset"
import { GraficoPeriodosDinamico } from "@/components/saude/grafico-periodos-dinamico"
import { LegendaCoropletico } from "@/components/saude/legenda-coropletico"
import { MapaCoropletico } from "@/components/saude/mapa-coropletico"
import { NotaTaxa } from "@/components/saude/nota-taxa"
import { RankingBairros } from "@/components/saude/ranking-bairros"
import { SeletorPeriodo } from "@/components/saude/seletor-periodo"
import { SeletorVersao } from "@/components/saude/seletor-versao"
import { TabelaCasosBairros } from "@/components/saude/tabela-casos-bairros"
import { TotalPeriodo } from "@/components/saude/total-periodo"
import { Button } from "@/components/ui/button"
import { useFiltroBairro } from "@/hooks/use-filtro-bairro"
import { useFiltroPeriodo } from "@/hooks/use-filtro-periodo"
import type { AnaliseDatasetSaude } from "@/lib/saude/analise-dataset"
import { montarAnalisePeriodo } from "@/lib/saude/analise-periodo"
import { ordenarRanking } from "@/lib/saude/ranking"
import type { DadosMapaResumo } from "@/lib/territorio/artefato-schema"

type AnaliseSaudeProps = {
  analise: AnaliseDatasetSaude
  /** Os 24 bairros com geometria e o limite: o mapa precisa deles, e a análise usa a identificação. */
  mapa: DadosMapaResumo
}

// Análise do dataset em exibição (RF-02.28 a RF-02.39): o período vem da URL e o `AnalisePeriodo` é calculado aqui
// uma vez; total, legenda, ranking e tabela leem esse mesmo objeto, então os valores são iguais em todas as
// apresentações (CA-02.19, DEC-T-06). Trocar o período recalcula sem tocar no banco.
export function AnaliseSaude({ analise, mapa }: AnaliseSaudeProps) {
  const bairros = mapa.bairros
  const {
    resolucao,
    selecionar: selecionarPeriodo,
    limpar: limparPeriodo,
  } = useFiltroPeriodo(analise.periodos)
  const { selecao, selecionar: selecionarBairro } = useFiltroBairro(bairros)
  const periodo = resolucao.tipo === "sem-dados" ? null : resolucao.periodo
  const bairroSelecionado = selecao.tipo === "bairro" ? selecao.bairro : null
  const selecionadoId = bairroSelecionado?.id ?? null

  const analisePeriodo = useMemo(
    () => (periodo ? montarAnalisePeriodo(analise, periodo, bairros) : null),
    [analise, periodo, bairros]
  )
  const ordenado = useMemo(
    () => (analisePeriodo ? ordenarRanking(analisePeriodo.bairros) : null),
    [analisePeriodo]
  )

  const { dataset, versao, opcoes, podeGerenciar } = analise
  return (
    <div className="flex flex-col gap-8">
      <CabecalhoDataset dataset={dataset} versao={versao} />
      {podeGerenciar ? <AcoesAnalista versao={versao} /> : null}
      <div className="flex flex-wrap gap-4">
        {opcoes.length > 1 ? (
          <SeletorVersao opcoes={opcoes} versaoId={versao.id} />
        ) : null}
        <SeletorPeriodo
          periodos={analise.periodos}
          periodo={periodo}
          onChange={selecionarPeriodo}
        />
      </div>

      {analisePeriodo && ordenado && periodo ? (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <MapaCoropletico
              mapa={mapa}
              analise={analisePeriodo}
              selecionadoId={selecionadoId}
              onSelecionar={selecionarBairro}
            />
            <div className="flex flex-col gap-8">
              <TotalPeriodo
                total={analisePeriodo.total}
                foraDaCobertura={analisePeriodo.foraDaCobertura}
              />
              <LegendaCoropletico
                indicador={dataset.indicador}
                unidade={dataset.unidade}
                periodo={periodo}
                classes={analisePeriodo.classes}
                foraDaCobertura={analisePeriodo.foraDaCobertura}
              />
            </div>
          </div>
          <GraficoPeriodosDinamico
            serie={analise}
            bairro={bairroSelecionado}
            unidade={dataset.unidade}
          />
          <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
            <RankingBairros
              ranking={ordenado.ranking}
              semDados={ordenado.semDados}
              selecionadoId={selecionadoId}
              onSelecionar={selecionarBairro}
            />
            <TabelaCasosBairros
              itens={analisePeriodo.bairros}
              selecionadoId={selecionadoId}
              onSelecionar={selecionarBairro}
            />
          </div>
        </>
      ) : (
        <EstadoInterface
          tipo="periodo-sem-dados"
          acao={
            <Button type="button" onClick={limparPeriodo}>
              Limpar período
            </Button>
          }
        />
      )}
      <NotaTaxa />
    </div>
  )
}
