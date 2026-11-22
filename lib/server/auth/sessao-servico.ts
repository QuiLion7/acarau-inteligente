import "server-only"

import { createHash, randomBytes } from "node:crypto"

import { buscarConta, type ContaDemo } from "@/lib/auth/contas-demo"
import type { SessaoValida } from "@/lib/auth/papeis"
import { impressaoCredencial } from "@/lib/auth/senha"
import { lerAmbiente } from "@/lib/config/ambiente"
import type { Executor } from "@/lib/server/db/cliente"
import {
  buscarSessaoPorTokenHash,
  encerrarSessaoPorTokenHash,
  inserirSessao,
  registrarAtividade,
} from "@/lib/server/auth/sessao-repositorio"

const TAMANHO_TOKEN_BYTES = 32
const MS_POR_MINUTO = 60_000
// Renovar a atividade a cada request escreveria no banco sem necessidade.
const INTERVALO_RENOVACAO_MS = 5 * MS_POR_MINUTO

export type SessaoCriada = { token: string; sessao: SessaoValida }

// O banco guarda só o SHA-256 do token; o valor em claro existe apenas no cookie.
function hashDoToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

function identificar(conta: ContaDemo): SessaoValida {
  return { usuario: conta.usuario, nome: conta.nome, papel: conta.papel }
}

export async function criarSessao(
  conta: ContaDemo,
  agora: Date,
  banco?: Executor
): Promise<SessaoCriada> {
  const token = randomBytes(TAMANHO_TOKEN_BYTES).toString("base64url")
  await inserirSessao(
    {
      tokenHash: hashDoToken(token),
      usuario: conta.usuario,
      impressaoCredencial: impressaoCredencial(conta.senhaHash),
      criadaEm: agora,
      ultimaAtividadeEm: agora,
    },
    banco
  )
  return { token, sessao: identificar(conta) }
}

// `null` para sem token, desconhecido, encerrada, inativa além do prazo, conta removida ou senha trocada
// (RF-00.23 a 00.25). O papel vem da conta no ambiente, não da sessão gravada.
export async function validarSessao(
  token: string | undefined,
  agora: Date
): Promise<SessaoValida | null> {
  if (!token) return null
  const tokenHash = hashDoToken(token)
  const registro = await buscarSessaoPorTokenHash(tokenHash)
  if (!registro || registro.encerradaEm) return null

  const ambiente = lerAmbiente()
  const inativoHaMs = agora.getTime() - registro.ultimaAtividadeEm.getTime()
  if (inativoHaMs > ambiente.SESSAO_INATIVIDADE_MIN * MS_POR_MINUTO) return null

  const conta = buscarConta(registro.usuario, ambiente)
  if (!conta) return null
  if (impressaoCredencial(conta.senhaHash) !== registro.impressaoCredencial) {
    return null
  }

  if (inativoHaMs > INTERVALO_RENOVACAO_MS) {
    await registrarAtividade(tokenHash, agora)
  }
  return identificar(conta)
}

// Idempotente: token ausente, desconhecido ou já encerrado não é erro (RF-00.24).
export async function encerrarSessao(
  token: string | undefined,
  agora: Date
): Promise<void> {
  if (!token) return
  await encerrarSessaoPorTokenHash(hashDoToken(token), agora)
}
