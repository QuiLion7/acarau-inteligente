import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TEXTOS_SAUDE } from "@/lib/config/textos-saude"
import type { AnalisePeriodo } from "@/lib/saude/analise-periodo"
import type { VariacaoPeriodo } from "@/lib/saude/variacao-periodo"

const { cards: TEXTOS } = TEXTOS_SAUDE

type CardsSaudeProps = {
  analise: AnalisePeriodo
  /** Variação do conjunto contra o período anterior (RF-03.02). */
  variacao: VariacaoPeriodo
  periodo: string
}

type CardIndicadorProps = {
  id: string
  titulo: string
  periodo: string
  children: ReactNode
}

function CardIndicador({ id, titulo, periodo, children }: CardIndicadorProps) {
  return (
    <Card role="group" aria-labelledby={id} size="sm">
      <CardHeader>
        <CardTitle>
          <h3 id={id}>{titulo}</h3>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {TEXTOS.periodo(periodo)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">{children}</CardContent>
    </Card>
  )
}

function Valor({ children }: { children: ReactNode }) {
  return <p className="text-3xl font-semibold tabular-nums">{children}</p>
}

function Detalhe({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}

function CardTotal({ analise, variacao, periodo }: CardsSaudeProps) {
  const { casos, bairrosComDados } = analise.total
  return (
    <CardIndicador
      id="card-total"
      titulo={TEXTOS.total.titulo}
      periodo={periodo}
    >
      {/* Sem nenhum bairro com dados não há número: ausência nunca vira zero (RN-03.02). */}
      {bairrosComDados === 0 ? (
        <Detalhe>{TEXTOS.total.semBairros}</Detalhe>
      ) : (
        <>
          <Valor>{TEXTOS.casos(casos)}</Valor>
          <Detalhe>{TEXTOS_SAUDE.total(bairrosComDados)}</Detalhe>
          <Detalhe>{TEXTOS_SAUDE.variacao(variacao)}</Detalhe>
        </>
      )}
    </CardIndicador>
  )
}

function CardForaDaCobertura({ analise, periodo }: CardsSaudeProps) {
  const { casos, localidades } = analise.foraDaCobertura
  return (
    <CardIndicador
      id="card-fora-da-cobertura"
      titulo={TEXTOS.foraDaCobertura.titulo}
      periodo={periodo}
    >
      {localidades === 0 ? (
        <Detalhe>{TEXTOS.foraDaCobertura.nenhum}</Detalhe>
      ) : (
        <>
          <Valor>{TEXTOS.casos(casos)}</Valor>
          <Detalhe>{TEXTOS.foraDaCobertura.detalhe(localidades)}</Detalhe>
        </>
      )}
    </CardIndicador>
  )
}

// Quatro cards do conjunto dos bairros no período (RF-03.01 a RF-03.03, RF-03.05): leem o mesmo `AnalisePeriodo` do
// mapa, do ranking e da tabela, então os números são iguais nas quatro apresentações (RN-03.01).
export function CardsSaude(props: CardsSaudeProps) {
  const { analise, periodo } = props
  const totalDeBairros = analise.bairros.length
  const { bairrosComDados } = analise.total
  return (
    <section
      aria-label={TEXTOS.resumo}
      className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <CardTotal {...props} />
      <CardIndicador
        id="card-com-dados"
        titulo={TEXTOS.comDados.titulo}
        periodo={periodo}
      >
        <Valor>{TEXTOS.contagem(bairrosComDados)}</Valor>
        <Detalhe>{TEXTOS.comDados.de(totalDeBairros)}</Detalhe>
      </CardIndicador>
      <CardIndicador
        id="card-sem-dados"
        titulo={TEXTOS.semDados.titulo}
        periodo={periodo}
      >
        <Valor>{TEXTOS.contagem(totalDeBairros - bairrosComDados)}</Valor>
        <Detalhe>{TEXTOS.semDados.descricao}</Detalhe>
      </CardIndicador>
      <CardForaDaCobertura {...props} />
    </section>
  )
}
