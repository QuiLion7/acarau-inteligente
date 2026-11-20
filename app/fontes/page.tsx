import type { Metadata } from "next"

import { ListaCamadas } from "@/app/fontes/components/lista-camadas"
import { EstadoInterface } from "@/components/estados/estado-interface"
import { CAMADAS_CARREGADAS } from "@/lib/config/camadas-carregadas"

export const metadata: Metadata = { title: "Fontes e limitações" }

// Lista só o que está em `CAMADAS_CARREGADAS` (RN-005): sem camada, diz que nenhuma foi carregada.
export default function PaginaFontes() {
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
    </div>
  )
}
