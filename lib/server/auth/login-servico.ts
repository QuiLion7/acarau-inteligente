import "server-only"

import { randomUUID } from "node:crypto"

import { sql } from "drizzle-orm"

import {
  avaliarBloqueio,
  inicioDaConsulta,
  type LimitesBloqueio,
} from "@/lib/auth/bloqueio-login"
import { buscarConta, normalizarUsuario } from "@/lib/auth/contas-demo"
import type { SessaoValida } from "@/lib/auth/papeis"
import { gerarHashSenha, verificarSenha } from "@/lib/auth/senha"
import { lerAmbiente, type Ambiente } from "@/lib/config/ambiente"
import { apagarSessoesInativasAntesDe } from "@/lib/server/auth/sessao-repositorio"
import { criarSessao } from "@/lib/server/auth/sessao-servico"
import {
  apagarTentativasAntesDe,
  listarTentativasDesde,
  registrarTentativa,
} from "@/lib/server/auth/tentativa-login-repositorio"
import { obterBanco, type Banco, type Transacao } from "@/lib/server/db/cliente"
import {
  registrarEvento,
  type EventoAuditoriaNovo,
} from "@/lib/server/auditoria/registrar-evento"

const MS_POR_DIA = 24 * 60 * 60 * 1000
const SESSAO_INATIVA_DIAS = 7
const TENTATIVA_ANTIGA_DIAS = 1

export type ResultadoEntrar =
  | { tipo: "sucesso"; token: string; sessao: SessaoValida }
  | { tipo: "credenciais-invalidas" }
  | { tipo: "bloqueado"; esperaMinutos: number }

// Conta inexistente também gasta o tempo de um scrypt completo, para a resposta não revelar quais usuários existem.
let hashFicticio: Promise<string> | undefined
function obterHashFicticio(): Promise<string> {
  hashFicticio ??= gerarHashSenha(randomUUID())
  return hashFicticio
}

function limitesDe(ambiente: Ambiente): LimitesBloqueio {
  return {
    maxFalhas: ambiente.LOGIN_MAX_FALHAS,
    janelaMin: ambiente.LOGIN_JANELA_MIN,
    bloqueioMin: ambiente.LOGIN_BLOQUEIO_MIN,
  }
}

async function limparRegistrosAntigos(
  agora: Date,
  banco: Banco
): Promise<void> {
  await Promise.all([
    apagarSessoesInativasAntesDe(
      new Date(agora.getTime() - SESSAO_INATIVA_DIAS * MS_POR_DIA),
      banco
    ),
    apagarTentativasAntesDe(
      new Date(agora.getTime() - TENTATIVA_ANTIGA_DIAS * MS_POR_DIA),
      banco
    ),
  ])
}

// Tentativas do mesmo usuário passam uma de cada vez, em qualquer instância: sem isso uma rajada simultânea lê as
// mesmas falhas antes de qualquer uma ser registrada e ultrapassa o limite (RF-00.29, CA-00.22, RF-05.35). O lock da
// transação (`pg_advisory_xact_lock`) vale entre processos e funciona no pooler em modo transação (DEC-T-07).
export async function emSerieNoBanco<T>(
  banco: Banco,
  usuario: string,
  fn: (tx: Transacao) => Promise<T>
): Promise<T> {
  return banco.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`login:${usuario}`}, 0))`
    )
    return fn(tx)
  })
}

// Cada usuário é atendido em série; o fluxo de uma tentativa está em `tentarEntrar`.
export async function entrar(
  usuario: string,
  senha: string,
  agora: Date,
  requestId: string,
  banco: Banco = obterBanco()
): Promise<ResultadoEntrar> {
  const usuarioNormalizado = normalizarUsuario(usuario)
  await limparRegistrosAntigos(agora, banco)
  const { resultado, evento } = await emSerieNoBanco(
    banco,
    usuarioNormalizado,
    (tx) => tentarEntrar(tx, usuarioNormalizado, senha, agora, requestId)
  )
  // Depois do commit: a falha da auditoria não desfaz a tentativa registrada nem a sessão criada (RF-05.30).
  await registrarEvento(evento, { banco, agora })
  return resultado
}

// Ordem (TechSpec §3): bloqueio (quem está bloqueado nem tem a senha verificada) → conta → senha → tentativa → sessão.
async function tentarEntrar(
  tx: Transacao,
  usuarioNormalizado: string,
  senha: string,
  agora: Date,
  requestId: string
): Promise<{ resultado: ResultadoEntrar; evento: EventoAuditoriaNovo }> {
  const ambiente = lerAmbiente()
  const limites = limitesDe(ambiente)
  const tentativas = await listarTentativasDesde(
    usuarioNormalizado,
    inicioDaConsulta(agora, limites),
    tx
  )
  const bloqueio = avaliarBloqueio(tentativas, agora, limites)
  if (bloqueio.bloqueado) {
    return {
      resultado: { tipo: "bloqueado", esperaMinutos: bloqueio.esperaMinutos },
      evento: {
        tipo: "login_bloqueado",
        requestId,
        conta: buscarConta(usuarioNormalizado, ambiente)?.usuario ?? null,
        camposLog: {
          requestId,
          usuario: usuarioNormalizado,
          resultado: "bloqueado",
        },
      },
    }
  }

  const conta = buscarConta(usuarioNormalizado, ambiente)
  const senhaConfere = await verificarSenha(
    senha,
    conta?.senhaHash ?? (await obterHashFicticio())
  )
  const sucesso = conta !== undefined && senhaConfere
  await registrarTentativa(
    { usuario: usuarioNormalizado, sucesso, ocorridaEm: agora },
    tx
  )

  if (!conta || !senhaConfere) {
    return {
      resultado: { tipo: "credenciais-invalidas" },
      // Usuário que não é conta demo vira "conta desconhecida": o texto digitado nunca é gravado (RF-05.25).
      evento: {
        tipo: "login_falha",
        requestId,
        conta: conta?.usuario ?? null,
        camposLog: {
          requestId,
          usuario: usuarioNormalizado,
          resultado: "credenciais-invalidas",
        },
      },
    }
  }

  const { token, sessao } = await criarSessao(conta, agora, tx)
  return {
    resultado: { tipo: "sucesso", token, sessao },
    evento: {
      tipo: "login_sucesso",
      requestId,
      conta: sessao.usuario,
      camposLog: { requestId, usuario: sessao.usuario, resultado: "sucesso" },
    },
  }
}
