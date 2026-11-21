import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { TEXTOS_SAUDE } from "@/lib/config/textos-saude"
import { formatarDataHora } from "@/lib/datasets/formato-versao"
import type { AnaliseDatasetSaude } from "@/lib/saude/analise-dataset"

type CabecalhoDatasetProps = Pick<AnaliseDatasetSaude, "dataset" | "versao">

function Item({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  )
}

// Identificação do dataset junto da análise (RF-02.29, CA-02.28): a faixa de dados sintéticos está sempre aqui, e
// versão privada é dita como privada.
export function CabecalhoDataset({ dataset, versao }: CabecalhoDatasetProps) {
  return (
    <section aria-labelledby="titulo-dataset" className="flex flex-col gap-4">
      <Alert role="note">
        <AlertDescription>{TEXTOS_SAUDE.faixaSintetico}</AlertDescription>
      </Alert>
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="titulo-dataset" className="text-2xl font-semibold">
          {dataset.nome}
        </h2>
        <Badge variant="secondary">{dataset.proveniencia}</Badge>
        {versao.situacao === "privado" ? (
          <Badge variant="outline">{TEXTOS_SAUDE.privado}</Badge>
        ) : null}
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Item rotulo="Indicador" valor={dataset.indicador} />
        <Item rotulo="Fonte" valor={dataset.fonte} />
        <Item rotulo="Versão" valor={String(versao.numero)} />
        <Item
          rotulo="Importado em"
          valor={formatarDataHora(versao.importadoEm)}
        />
      </dl>
    </section>
  )
}
