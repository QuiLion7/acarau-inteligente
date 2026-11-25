import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { EstadoInterface } from "@/components/estados/estado-interface"
import { AnaliseSaude } from "@/components/saude/analise-saude"
import { buttonVariants } from "@/components/ui/button"
import { moduloPorId } from "@/lib/config/modulos"
import { lerVersaoDaUrl } from "@/lib/filtros/versao-da-url"
import { obterSessaoAtual } from "@/lib/server/auth/dal"
import { montarAnaliseDataset } from "@/lib/server/datasets/analise-dataset-servico"
import { obterBanco } from "@/lib/server/db/cliente"
import { obterDadosMapaResumo } from "@/lib/server/territorio/territorio-repositorio"

const modulo = moduloPorId("saude")

export const metadata: Metadata = { title: modulo.rotulo }

type ParametrosDaUrl = Record<string, string | string[] | undefined>

// Server Component (DV-17, DV-25): lê a sessão e o repositório e só entrega ao cliente a versão que o papel pode ver.
export default async function PaginaSaude({
  searchParams,
}: {
  searchParams: Promise<ParametrosDaUrl>
}) {
  const [parametros, sessao] = await Promise.all([
    searchParams,
    obterSessaoAtual(),
  ])
  const papel = sessao?.papel ?? "visitante"
  const resultado = await montarAnaliseDataset(obterBanco(), {
    versaoId: lerVersaoDaUrl(parametros),
    papel,
  })

  return (
    <div className="flex flex-col gap-6">
      <header className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {modulo.rotulo}
        </h1>
        <p className="text-muted-foreground">{modulo.descricao}</p>
      </header>
      {resultado.status === "ok" ? (
        <Suspense fallback={null}>
          <AnaliseSaude
            analise={resultado.analise}
            mapa={obterDadosMapaResumo()}
          />
        </Suspense>
      ) : null}
      {resultado.status === "nenhum-dataset" ? (
        <EstadoInterface
          tipo="vazio"
          titulo={
            sessao ? "Nenhum dataset importado" : "Nenhum dataset publicado"
          }
          descricao={
            sessao
              ? "Importe um arquivo CSV para criar o primeiro dataset de saúde."
              : "Ainda não há dataset publicado. Volte mais tarde."
          }
          acao={
            sessao ? (
              <Link href="/saude/importar" className={buttonVariants()}>
                Importar CSV
              </Link>
            ) : undefined
          }
        />
      ) : null}
      {resultado.status === "nao-encontrada" ? (
        <EstadoInterface
          tipo="vazio"
          titulo="Dataset não encontrado"
          descricao="Este dataset não existe ou não está disponível para você."
          acao={
            <Link href="/saude" className={buttonVariants()}>
              Ver o dataset publicado
            </Link>
          }
        />
      ) : null}
    </div>
  )
}
