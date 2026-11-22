import type { Metadata } from "next"
import Link from "next/link"

import { FiltrosAuditoriaForm } from "@/app/admin/auditoria/components/filtros-auditoria"
import { TabelaAuditoria } from "@/app/admin/auditoria/components/tabela-auditoria"
import { EstadoInterface } from "@/components/estados/estado-interface"
import { contasDoAmbiente } from "@/lib/auth/contas-demo"
import { lerAmbiente } from "@/lib/config/ambiente"
import { TEXTOS_AUDITORIA } from "@/lib/config/textos-auditoria"
import type { PaginaAuditoria } from "@/lib/auditoria/tipos-auditoria"
import { listarEventos } from "@/lib/server/auditoria/auditoria-repositorio"
import { exigirPapelNaPagina } from "@/lib/server/auth/dal"
import { obterBanco } from "@/lib/server/db/cliente"
import { log } from "@/lib/server/log"
import {
  haFiltroDeAuditoria,
  lerFiltrosAuditoria,
} from "@/lib/validations/auditoria-schema"

export const metadata: Metadata = { title: TEXTOS_AUDITORIA.titulo }

type ParametrosDaUrl = Record<string, string | string[] | undefined>

// Falha do banco vira o estado de erro da página, registrada uma vez, aqui, onde é tratada.
async function lerPagina(
  filtros: Parameters<typeof listarEventos>[1],
  contas: Parameters<typeof listarEventos>[2]
): Promise<PaginaAuditoria | null> {
  try {
    const banco = obterBanco()
    const pagina = await listarEventos(banco, filtros, contas)
    // Página além da última (URL antiga ou editada): mostra a última, em vez de uma lista vazia com total.
    if (pagina.total > 0 && pagina.eventos.length === 0) {
      return await listarEventos(
        banco,
        { ...filtros, pagina: pagina.paginas },
        contas
      )
    }
    return pagina
  } catch (erro) {
    log.error("auditoria.leitura_falhou", { erro })
    return null
  }
}

// Server Component restrito ao administrador (RF-05.26, DEC-T-11): a recusa acontece aqui, no servidor, e nenhum
// evento é lido para quem não é administrador. Sem endpoint de leitura (padrão DV-17/DV-42).
export default async function PaginaAuditoria({
  searchParams,
}: {
  searchParams: Promise<ParametrosDaUrl>
}) {
  const acesso = await exigirPapelNaPagina("administrador", "/admin/auditoria")
  if (acesso.tipo === "sem-permissao") {
    return <EstadoInterface tipo="sem-permissao" nivelTitulo={1} />
  }

  const contas = contasDoAmbiente(lerAmbiente()).map(({ usuario, nome }) => ({
    usuario,
    nome,
  }))
  const filtros = lerFiltrosAuditoria(
    await searchParams,
    contas.map(({ usuario }) => usuario)
  )
  const haFiltro = haFiltroDeAuditoria(filtros)
  const pagina = await lerPagina(filtros, contas)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {TEXTOS_AUDITORIA.titulo}
        </h1>
        <p className="text-muted-foreground">{TEXTOS_AUDITORIA.descricao}</p>
        <p>
          <Link href="/admin" className="underline underline-offset-4">
            Voltar à Administração
          </Link>
        </p>
      </header>
      <FiltrosAuditoriaForm
        filtros={filtros}
        contas={contas}
        haFiltro={haFiltro}
      />
      {pagina ? (
        <TabelaAuditoria pagina={pagina} haFiltro={haFiltro} />
      ) : (
        <EstadoInterface tipo="erro" />
      )}
    </div>
  )
}
