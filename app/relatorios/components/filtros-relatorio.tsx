"use client"

import { SeletorPeriodo } from "@/components/saude/seletor-periodo"
import { EstadoInterface } from "@/components/estados/estado-interface"
import { SeletorBairro } from "@/components/territorio/seletor-bairro"
import { Button } from "@/components/ui/button"
import { useFiltroBairro } from "@/hooks/use-filtro-bairro"
import { useFiltroPeriodo } from "@/hooks/use-filtro-periodo"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"

const SEM_PERIODOS: readonly string[] = []

type FiltrosRelatorioProps = {
  bairros: readonly BairroResumo[]
  /** Os períodos do dataset em exibição; `null` quando não há dataset visível (o seletor de período some). */
  periodos: readonly string[] | null
}

// Filtros do relatório (RF-05.02): bairro e período vivem na URL, como nas telas (DV-12, DV-27, DV-34); trocar um deles
// reescreve a URL e o Server Component monta de novo o relatório com o mesmo critério da tela.
export function FiltrosRelatorio({ bairros, periodos }: FiltrosRelatorioProps) {
  const { selecao, selecionar, limpar } = useFiltroBairro(bairros)
  const {
    resolucao,
    selecionar: selecionarPeriodo,
    limpar: limparPeriodo,
  } = useFiltroPeriodo(periodos ?? SEM_PERIODOS)
  const periodo = resolucao.tipo === "sem-dados" ? null : resolucao.periodo

  return (
    <section
      aria-labelledby="titulo-filtros-relatorio"
      className="flex flex-col gap-4"
    >
      <h2 id="titulo-filtros-relatorio" className="sr-only">
        Filtros do relatório
      </h2>
      <div className="flex flex-wrap items-end gap-4">
        <SeletorBairro
          id="seletor-bairro"
          bairros={bairros}
          selecao={selecao}
          onSelecionar={selecionar}
          onLimpar={limpar}
        />
        {periodos !== null ? (
          <SeletorPeriodo
            periodos={periodos}
            periodo={periodo}
            onChange={selecionarPeriodo}
          />
        ) : null}
        {periodos !== null && resolucao.tipo === "sem-dados" ? (
          <Button type="button" variant="outline" onClick={limparPeriodo}>
            Limpar período
          </Button>
        ) : null}
      </div>
      {selecao.tipo === "nao-reconhecido" ? (
        <EstadoInterface
          tipo="bairro-nao-reconhecido"
          acao={
            <Button type="button" onClick={limpar}>
              Limpar bairro
            </Button>
          }
        />
      ) : null}
    </section>
  )
}
