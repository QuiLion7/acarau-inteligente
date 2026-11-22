import { SimboloObra } from "@/components/obras/simbolo-obra"
import { TEXTOS_OBRAS } from "@/lib/config/textos-obras"
import { SITUACOES_OBRA, type SituacaoObra } from "@/lib/obras/situacao-obra"
import { ICONES_OBRA } from "@/lib/territorio/estilo-mapa"

type LegendaObrasProps = {
  /** Marcadores desenhados no mapa por situação (as obras do filtro com ponto). */
  marcadoresPorSituacao: Record<SituacaoObra, number>
}

// Legenda em HTML (DV-20): forma e nome de cada situação, com a contagem de marcadores; só descreve o que o mapa
// desenha. A obra sem localização não tem marcador (RN-04.02) e a legenda diz isso.
export function LegendaObras({ marcadoresPorSituacao }: LegendaObrasProps) {
  return (
    <section
      aria-labelledby="titulo-legenda-obras"
      className="flex flex-col gap-2"
    >
      <h3 id="titulo-legenda-obras" className="text-sm font-semibold">
        {TEXTOS_OBRAS.legenda.titulo}
      </h3>
      <ul className="flex flex-col gap-1.5 text-sm">
        {SITUACOES_OBRA.map((situacao) => (
          <li key={situacao} className="flex items-center gap-2">
            <SimboloObra situacao={situacao} />
            {ICONES_OBRA[situacao].rotulo}:{" "}
            {TEXTOS_OBRAS.legenda.marcadores(marcadoresPorSituacao[situacao])}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {TEXTOS_OBRAS.legenda.semMarcador}
      </p>
    </section>
  )
}
