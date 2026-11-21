import { TEXTOS_SAUDE } from "@/lib/config/textos-saude"
import type { ItemDoRanking } from "@/lib/saude/ranking"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"
import { cn } from "@/lib/utils"

type RankingBairrosProps = {
  ranking: readonly ItemDoRanking[]
  semDados: readonly BairroResumo[]
  selecionadoId: string | null
  onSelecionar: (idBairro: string) => void
}

const formatadorDeNumero = new Intl.NumberFormat("pt-BR")

// Ranking dos bairros com dados (RF-02.33, CA-02.22): a regra de ordenação está escrita, o zero informado entra no
// fim e quem está sem dados é citado à parte, fora da ordem.
export function RankingBairros({
  ranking,
  semDados,
  selecionadoId,
  onSelecionar,
}: RankingBairrosProps) {
  return (
    <section aria-labelledby="titulo-ranking" className="flex flex-col gap-3">
      <h3 id="titulo-ranking" className="text-lg font-semibold">
        Ranking dos bairros
      </h3>
      <p className="text-sm text-muted-foreground">
        {TEXTOS_SAUDE.regraRanking}
      </p>
      {ranking.length === 0 ? (
        <p>Nenhum bairro tem dados no período.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {ranking.map(({ bairro, casos }) => {
            const selecionado = bairro.id === selecionadoId
            return (
              <li
                key={bairro.id}
                className="flex items-baseline justify-between gap-3 border-b py-1.5 last:border-b-0"
              >
                <button
                  type="button"
                  aria-current={selecionado ? "true" : undefined}
                  onClick={() => onSelecionar(bairro.id)}
                  className={cn(
                    "rounded-sm text-left underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    selecionado && "font-semibold text-primary"
                  )}
                >
                  {bairro.nome}
                </button>
                <span className="tabular-nums">
                  {formatadorDeNumero.format(casos)}{" "}
                  {casos === 1 ? "caso" : "casos"}
                </span>
              </li>
            )
          })}
        </ol>
      )}
      {semDados.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Sem dados no período, fora do ranking:{" "}
          {semDados.map(({ nome }) => nome).join(", ")}.
        </p>
      ) : null}
    </section>
  )
}
