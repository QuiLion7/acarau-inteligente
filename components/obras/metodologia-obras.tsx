import { ChevronDown } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { TEXTOS_OBRAS } from "@/lib/config/textos-obras"

const { metodologia: TEXTOS } = TEXTOS_OBRAS

type MetodologiaObrasProps = {
  // Regra de fronteira do artefato (`regraFronteira`): fonte única, a mesma que a carga aplicou (DV-40).
  regraFronteira: string
}

// Metodologia de Obras (RF-04.13, DV-38): recolhida, com a regra do bairro da obra e da fronteira, a obra sem
// localização e o valor previsto, que não é execução financeira.
export function MetodologiaObras({ regraFronteira }: MetodologiaObrasProps) {
  const regras = [
    TEXTOS.contagem,
    TEXTOS.bairro,
    regraFronteira,
    TEXTOS.semLocalizacao,
    TEXTOS.valor,
    TEXTOS.sintetico,
  ]
  return (
    <Collapsible className="flex flex-col gap-3 rounded-2xl border p-4">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 rounded-sm text-left text-lg font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
        {TEXTOS.titulo}
        <ChevronDown
          aria-hidden
          className="size-5 transition-transform group-data-panel-open:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4 text-sm">
        <ul className="flex max-w-prose list-disc flex-col gap-2 pl-5">
          {regras.map((regra) => (
            <li key={regra}>{regra}</li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}
