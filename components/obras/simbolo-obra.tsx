import { ICONES_OBRA } from "@/lib/territorio/estilo-mapa"
import type { FormaMarcadorObra, SituacaoObra } from "@/lib/obras/situacao-obra"

const FORMA_DO_SIMBOLO: Record<FormaMarcadorObra, string> = {
  circulo: "rounded-full",
  quadrado: "rounded-none",
  triangulo: "rounded-none [clip-path:polygon(50%_0,100%_100%,0_100%)]",
  losango: "rounded-none [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)]",
}

/** O marcador da situação em HTML: a mesma forma e cor do ícone do mapa; o texto ao lado diz o que significa (DV-20). */
export function SimboloObra({ situacao }: { situacao: SituacaoObra }) {
  const { forma, cor } = ICONES_OBRA[situacao]
  return (
    <span
      aria-hidden
      className={`size-4 shrink-0 ${FORMA_DO_SIMBOLO[forma]}`}
      style={{ backgroundColor: cor }}
    />
  )
}
