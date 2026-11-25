import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { EstadoInterface } from "@/components/estados/estado-interface"
import { ExploradorTerritorio } from "@/components/territorio/explorador-territorio"
import { buttonVariants } from "@/components/ui/button"
import { moduloPorId } from "@/lib/config/modulos"
import {
  comFiltros,
  lerFiltros,
  resolverBairro,
  TODOS,
} from "@/lib/filtros/filtros-url"
import {
  listarResumoBairros,
  obterDadosTerritorio,
} from "@/lib/server/territorio/territorio-repositorio"

const modulo = moduloPorId("territorio")

export const metadata: Metadata = { title: modulo.rotulo }

type ParametrosDaUrl = Record<string, string | string[] | undefined>

function primeiroValor(parametros: ParametrosDaUrl, nome: string) {
  const valor = parametros[nome]
  return Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null)
}

// Server Component (DV-17): lê o repositório e decide, no servidor, se o `bairro` da URL é reconhecido.
export default async function PaginaTerritorio({
  searchParams,
}: {
  searchParams: Promise<ParametrosDaUrl>
}) {
  const parametros = await searchParams
  const filtros = lerFiltros({ get: (nome) => primeiroValor(parametros, nome) })
  const selecao = resolverBairro(filtros, listarResumoBairros())

  const { bairros, limite, escolas, qualidade } = obterDadosTerritorio()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {modulo.rotulo}
        </h1>
        <p className="text-muted-foreground">{modulo.descricao}</p>
      </header>
      {selecao.tipo === "nao-reconhecido" ? (
        <EstadoInterface
          tipo="bairro-nao-reconhecido"
          acao={
            <Link
              href={comFiltros("/territorio", { ...filtros, bairro: TODOS })}
              className={buttonVariants()}
            >
              Limpar bairro
            </Link>
          }
        />
      ) : (
        <Suspense fallback={null}>
          <ExploradorTerritorio
            bairros={bairros}
            limite={limite}
            escolas={escolas}
            qualidade={qualidade}
          />
        </Suspense>
      )}
    </div>
  )
}
