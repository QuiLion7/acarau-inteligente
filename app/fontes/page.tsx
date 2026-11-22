import type { Metadata } from "next"

import { EntradaObras } from "@/app/fontes/components/entrada-obras"
import { ListaCamadas } from "@/app/fontes/components/lista-camadas"
import { ListaDatasets } from "@/app/fontes/components/lista-datasets"
import { EstadoInterface } from "@/components/estados/estado-interface"
import { CAMADAS_CARREGADAS } from "@/lib/config/camadas-carregadas"
import { listarDatasetsPublicados } from "@/lib/server/datasets/dataset-repositorio"
import { obterBanco } from "@/lib/server/db/cliente"
import { resumirObrasParaFontes } from "@/lib/server/obras/obra-repositorio"

export const metadata: Metadata = { title: "Fontes e limitações" }

// Lista só o que está em `CAMADAS_CARREGADAS` (RN-005), os datasets publicados (RF-02.40) e as obras (RF-04.34); o
// visitante nunca vê dataset privado, porque só as versões publicadas são lidas aqui. Sem camada, diz que nenhuma foi
// carregada.
export default async function PaginaFontes() {
  const banco = obterBanco()
  const [datasets, obras] = await Promise.all([
    listarDatasetsPublicados(banco),
    resumirObrasParaFontes(banco),
  ])
  return (
    <div className="flex flex-col gap-6">
      <header className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Fontes e limitações
        </h1>
        <p className="text-muted-foreground">
          Origem e versão de cada camada de dados disponível na demonstração.
        </p>
      </header>
      {CAMADAS_CARREGADAS.length === 0 ? (
        <EstadoInterface
          tipo="vazio"
          titulo="Nenhuma camada de dados foi carregada ainda"
          descricao="Cada camada passa a ser listada aqui, com fonte e versão, quando for carregada."
        />
      ) : (
        <ListaCamadas camadas={CAMADAS_CARREGADAS} />
      )}
      <ListaDatasets datasets={datasets} />
      <EntradaObras resumo={obras} />
    </div>
  )
}
