import type { Metadata } from "next"
import { Suspense } from "react"

import { EstadoInterface } from "@/components/estados/estado-interface"
import { PainelObras } from "@/components/obras/painel-obras"
import { temPapel } from "@/lib/auth/papeis"
import { moduloPorId } from "@/lib/config/modulos"
import { obterSessaoAtual } from "@/lib/server/auth/dal"
import { obterBanco } from "@/lib/server/db/cliente"
import { log } from "@/lib/server/log"
import { listarObras } from "@/lib/server/obras/obra-repositorio"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"
import { idObraSchema, type Obra } from "@/lib/validations/obra-schema"

const modulo = moduloPorId("obras")

export const metadata: Metadata = { title: modulo.rotulo }

// Falha do banco vira o estado de erro da página, não uma tela quebrada; registrada uma vez, aqui, onde é tratada.
async function lerObras(): Promise<Obra[] | null> {
  try {
    return await listarObras(obterBanco())
  } catch (erro) {
    log.error("obras.leitura_falhou", { erro })
    return null
  }
}

type ParametrosDaUrl = Record<string, string | string[] | undefined>

// `obra=<uuid>` abre a ficha (link da auditoria, RF-05.28); valor que não é uuid ou obra que não existe é ignorado.
function obraDaUrl(
  parametro: string | string[] | undefined,
  obras: readonly Obra[]
): string | null {
  const lido = idObraSchema.safeParse(
    Array.isArray(parametro) ? parametro[0] : parametro
  )
  return lido.success && obras.some(({ id }) => id === lido.data)
    ? lido.data
    : null
}

// Server Component (DV-17, DV-42): leitura pública, sem `GET`; lê as obras com o histórico, a sessão e o território e
// entrega ao cliente só o que a tela usa. Todos os perfis veem todas as obras (RF-04.01); "Nova obra" e "Editar" só
// para analista ou acima, e `nova=1` só abre o formulário para eles (o servidor recusa a escrita de qualquer forma).
export default async function PaginaObras({
  searchParams,
}: {
  searchParams: Promise<ParametrosDaUrl>
}) {
  const [parametros, sessao, obras] = await Promise.all([
    searchParams,
    obterSessaoAtual(),
    lerObras(),
  ])
  const podeEditar = sessao !== null && temPapel(sessao.papel, "analista")
  const { bairros, limite, regraFronteira } = obterDadosTerritorio()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {modulo.rotulo}
        </h1>
        <p className="text-muted-foreground">{modulo.descricao}</p>
      </header>
      {obras ? (
        <Suspense fallback={null}>
          <PainelObras
            obras={obras}
            bairros={bairros}
            limite={limite}
            regraFronteira={regraFronteira}
            podeEditar={podeEditar}
            abrirNova={parametros.nova === "1"}
            obraInicialId={obraDaUrl(parametros.obra, obras)}
          />
        </Suspense>
      ) : (
        <EstadoInterface tipo="erro" />
      )}
    </div>
  )
}
