import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TEXTOS_SAUDE } from "@/lib/config/textos-saude"
import type { ItemBairroPeriodo } from "@/lib/saude/analise-periodo"
import type { VariacaoPeriodo } from "@/lib/saude/variacao-periodo"

const { bairro: TEXTOS } = TEXTOS_SAUDE.cards

type CardBairroSelecionadoProps = {
  item: ItemBairroPeriodo
  /** Posição no ranking; `null` quando o bairro está sem dados e fora dele. */
  posicao: number | null
  totalNoRanking: number
  /** Variação do bairro sozinho contra o período anterior (RF-03.04). */
  variacao: VariacaoPeriodo
  periodo: string
}

function textoDoValor({ situacao, casos }: ItemBairroPeriodo): string {
  if (situacao === "sem-dados" || casos === null) return TEXTOS.semDados
  return situacao === "zero" ? TEXTOS.zero : TEXTOS_SAUDE.cards.casos(casos)
}

// Números do bairro escolhido (RF-03.04): valor, zero ou sem dados, posição no ranking ou "fora do ranking" e a
// variação com as mesmas regras do conjunto. Lê a mesma análise do período que os outros cards (RN-03.01).
export function CardBairroSelecionado({
  item,
  posicao,
  totalNoRanking,
  variacao,
  periodo,
}: CardBairroSelecionadoProps) {
  const { bairro } = item
  return (
    <Card role="group" aria-labelledby="card-bairro" size="sm">
      <CardHeader>
        <CardTitle>
          <h3 id="card-bairro">{TEXTOS.titulo}</h3>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {TEXTOS_SAUDE.cards.periodo(periodo)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="text-lg font-semibold">
          {bairro.nome}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {TEXTOS.uv(bairro.uv)}
          </span>
        </p>
        <p className="text-3xl font-semibold tabular-nums">
          {textoDoValor(item)}
        </p>
        <p className="text-sm text-muted-foreground">
          {posicao === null
            ? TEXTOS.foraDoRanking
            : TEXTOS.posicao(posicao, totalNoRanking)}
        </p>
        <p className="text-sm text-muted-foreground">
          {TEXTOS_SAUDE.variacao(variacao)}
        </p>
      </CardContent>
    </Card>
  )
}
