import { Badge } from "@/components/ui/badge"
import {
  formatarDataHora,
  rotuloDosPeriodos,
} from "@/lib/datasets/formato-versao"
import type { DatasetPublicado } from "@/lib/server/datasets/dataset-repositorio"

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-wrap gap-x-1.5">
      <dt>{rotulo}:</dt>
      <dd className="text-foreground">{valor}</dd>
    </div>
  )
}

// Datasets publicados ao lado das camadas (RF-02.40, CA-02.31): nome, indicador, versão, fonte, períodos, data de
// importação e a etiqueta de proveniência. Só renderiza o que recebe: quem decide o que é público é o repositório.
export function ListaDatasets({
  datasets,
}: {
  datasets: readonly DatasetPublicado[]
}) {
  return (
    <section aria-labelledby="titulo-datasets" className="flex flex-col gap-4">
      <h2 id="titulo-datasets" className="text-2xl font-semibold">
        Datasets de saúde publicados
      </h2>
      {datasets.length === 0 ? (
        <p className="text-muted-foreground">
          Nenhum dataset de saúde está publicado no momento.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {datasets.map(({ dataset, versao }) => (
            <article
              key={versao.id}
              aria-labelledby={`dataset-${versao.id}`}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 id={`dataset-${versao.id}`} className="font-medium">
                  {dataset.nome}
                </h3>
                <Badge variant="secondary">{dataset.proveniencia}</Badge>
              </div>
              <dl className="flex flex-col gap-1 text-sm text-muted-foreground">
                <Campo rotulo="Indicador" valor={dataset.indicador} />
                <Campo rotulo="Versão" valor={String(versao.numero)} />
                <Campo rotulo="Fonte" valor={dataset.fonte} />
                <Campo
                  rotulo="Períodos"
                  valor={rotuloDosPeriodos(versao.periodos)}
                />
                <Campo
                  rotulo="Importado em"
                  valor={formatarDataHora(versao.importadoEm)}
                />
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
