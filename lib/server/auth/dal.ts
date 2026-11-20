import "server-only"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"

import { NOME_COOKIE_SESSAO } from "@/lib/auth/nome-cookie-sessao"
import {
  temPapel,
  type PapelRestrito,
  type SessaoValida,
} from "@/lib/auth/papeis"
import { validarSessao } from "@/lib/server/auth/sessao-servico"

export type AcessoDaPagina =
  { tipo: "ok"; sessao: SessaoValida } | { tipo: "sem-permissao" }

// Data Access Layer (RF-00.25): a única leitura de sessão em Server Component. `cache` evita validar
// o cookie de novo a cada componente do mesmo render (cabeçalho e página).
export const obterSessaoAtual = cache(
  async (): Promise<SessaoValida | null> => {
    const jar = await cookies()
    return validarSessao(jar.get(NOME_COOKIE_SESSAO)?.value, new Date())
  }
)

// Página restrita (seguranca.md §1): sem sessão válida vai ao login e volta depois; papel abaixo do
// mínimo recebe o estado "sem permissão" (`forbidden()` ainda é experimental no Next 16.4.5).
export async function exigirPapelNaPagina(
  minimo: PapelRestrito,
  caminho: string
): Promise<AcessoDaPagina> {
  const sessao = await obterSessaoAtual()
  if (!sessao) {
    redirect(`/entrar?motivo=expirada&retorno=${encodeURIComponent(caminho)}`)
  }
  return temPapel(sessao.papel, minimo)
    ? { tipo: "ok", sessao }
    : { tipo: "sem-permissao" }
}
