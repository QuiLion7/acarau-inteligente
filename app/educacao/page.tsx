import type { Metadata } from "next"

import { PainelEducacao } from "@/components/educacao/painel-educacao"
import { EstadoInterface } from "@/components/estados/estado-interface"
import { CAMADAS_CARREGADAS } from "@/lib/config/camadas-carregadas"
import { moduloPorId } from "@/lib/config/modulos"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

const modulo = moduloPorId("educacao")

export const metadata: Metadata = { title: modulo.rotulo }

// Server Component (DV-17): lê o artefato do Território, que já traz as contagens validadas na carga (DV-37), e a
// fonte e a data de referência da camada de escolas, as mesmas de "Fontes e limitações". Sem a camada, os números
// ficariam sem fonte: a página mostra o estado em vez deles (RN-03.12).
export default function PaginaEducacao() {
  const camadaEscolas = CAMADAS_CARREGADAS.find(({ id }) => id === "escolas")
  const { regraFronteira, bairros, limite, escolas, qualidade } =
    obterDadosTerritorio()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {modulo.rotulo}
        </h1>
        <p className="text-muted-foreground">{modulo.descricao}</p>
      </header>
      {camadaEscolas ? (
        <PainelEducacao
          bairros={bairros}
          limite={limite}
          escolas={escolas}
          qualidade={qualidade}
          regraFronteira={regraFronteira}
          fonte={camadaEscolas.fonte}
          dataReferencia={camadaEscolas.dataReferencia}
        />
      ) : (
        <EstadoInterface tipo="fonte-ausente" />
      )}
    </div>
  )
}
