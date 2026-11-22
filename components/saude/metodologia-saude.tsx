import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { TEXTOS_SAUDE } from "@/lib/config/textos-saude"
import type { AnaliseDatasetSaude } from "@/lib/saude/analise-dataset"
import { ChevronDown } from "lucide-react"

const { metodologia: TEXTOS } = TEXTOS_SAUDE

type MetodologiaSaudeProps = {
  analise: Pick<AnaliseDatasetSaude, "dataset" | "versao" | "periodos">
}

function DadoDoDataset({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-2">
      <dt className="font-medium">{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  )
}

// Metodologia da Saúde (RF-03.11, RF-03.12, DV-38): recolhida, com os dados do dataset em tela e as regras de cálculo.
// A taxa e a regra do ranking moram só aqui (PA-03.04).
export function MetodologiaSaude({ analise }: MetodologiaSaudeProps) {
  const { dataset, versao, periodos } = analise
  const regras = [
    TEXTOS.registro,
    TEXTOS.total,
    TEXTOS.zeroSemDados,
    TEXTOS.classes,
    TEXTOS_SAUDE.classeUnica,
    TEXTOS_SAUDE.regraRanking,
    TEXTOS.variacao,
    TEXTOS_SAUDE.taxa,
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
        <dl className="flex flex-col gap-1">
          <DadoDoDataset rotulo={TEXTOS.dataset.nome} valor={dataset.nome} />
          <DadoDoDataset rotulo={TEXTOS.dataset.fonte} valor={dataset.fonte} />
          <DadoDoDataset
            rotulo={TEXTOS.dataset.versao}
            valor={String(versao.numero)}
          />
          <DadoDoDataset
            rotulo={TEXTOS.dataset.granularidade}
            valor={TEXTOS.granularidade(versao.granularidade)}
          />
          <DadoDoDataset
            rotulo={TEXTOS.dataset.unidade}
            valor={dataset.unidade}
          />
          <DadoDoDataset
            rotulo={TEXTOS.dataset.periodos}
            valor={periodos.join(", ")}
          />
        </dl>
        <ul className="flex max-w-prose list-disc flex-col gap-2 pl-5">
          {regras.map((regra) => (
            <li key={regra}>{regra}</li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}
