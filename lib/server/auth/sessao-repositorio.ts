import "server-only"

import { and, eq, isNull, lt } from "drizzle-orm"

import { obterBanco } from "@/lib/server/db/cliente"
import { sessao, type NovaSessao, type Sessao } from "@/lib/server/db/schema"

export async function inserirSessao(nova: NovaSessao): Promise<void> {
  await obterBanco().insert(sessao).values(nova)
}

export async function buscarSessaoPorTokenHash(
  tokenHash: string
): Promise<Sessao | undefined> {
  const [encontrada] = await obterBanco()
    .select()
    .from(sessao)
    .where(eq(sessao.tokenHash, tokenHash))
    .limit(1)
  return encontrada
}

export async function registrarAtividade(
  tokenHash: string,
  agora: Date
): Promise<void> {
  await obterBanco()
    .update(sessao)
    .set({ ultimaAtividadeEm: agora })
    .where(eq(sessao.tokenHash, tokenHash))
}

// Idempotente: só preenche `encerrada_em` de sessão ainda ativa.
export async function encerrarSessaoPorTokenHash(
  tokenHash: string,
  agora: Date
): Promise<void> {
  await obterBanco()
    .update(sessao)
    .set({ encerradaEm: agora })
    .where(and(eq(sessao.tokenHash, tokenHash), isNull(sessao.encerradaEm)))
}

export async function apagarSessoesInativasAntesDe(
  limite: Date
): Promise<void> {
  await obterBanco().delete(sessao).where(lt(sessao.ultimaAtividadeEm, limite))
}
