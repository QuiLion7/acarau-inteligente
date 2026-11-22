import { ChevronDown } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { TEXTOS_EDUCACAO } from "@/lib/config/textos-educacao"

const { metodologia: TEXTOS } = TEXTOS_EDUCACAO

type MetodologiaEducacaoProps = {
  // Regra de fronteira do artefato (`regraFronteira`): fonte única, a mesma que a carga aplicou (DV-37).
  regraFronteira: string
  fonte: string
  dataReferencia: string
}

// Metodologia da Educação (RF-03.21, DV-38): recolhida, com as regras de contagem e a fonte com a data de referência.
// Nenhum texto afirma completude nem funcionamento atual da base (RN-03.08).
export function MetodologiaEducacao({
  regraFronteira,
  fonte,
  dataReferencia,
}: MetodologiaEducacaoProps) {
  const regras = [
    TEXTOS.contagem,
    regraFronteira,
    TEXTOS.foraDaCobertura,
    TEXTOS.foraDoLimite,
    TEXTOS.semLocalizacao,
    TEXTOS.zero,
    TEXTOS.limites,
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
        <dl className="flex flex-col gap-1">
          <div className="flex flex-col sm:flex-row sm:gap-2">
            <dt className="font-medium">{TEXTOS.base.fonte}</dt>
            <dd>{fonte}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:gap-2">
            <dt className="font-medium">{TEXTOS.base.dataReferencia}</dt>
            <dd>{dataReferencia}</dd>
          </div>
        </dl>
      </CollapsibleContent>
    </Collapsible>
  )
}
