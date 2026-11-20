import "server-only"

import { randomUUID } from "node:crypto"

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
import { log } from "@/lib/server/log"

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

async function limparRegistrosAntigos(agora: Date): Promise<void> {
  await Promise.all([
    apagarSessoesInativasAntesDe(
      new Date(agora.getTime() - SESSAO_INATIVA_DIAS * MS_POR_DIA)
    ),
    apagarTentativasAntesDe(
      new Date(agora.getTime() - TENTATIVA_ANTIGA_DIAS * MS_POR_DIA)
    ),
  ])
}

// Tentativas do mesmo usuário passam uma de cada vez: sem isso uma rajada simultânea lê as mesmas falhas antes de
// qualquer uma ser registrada e ultrapassa o limite (RF-00.29, CA-00.22). Um processo só atende o app (PR-01).
const tentativasEmCurso = new Map<string, Promise<void>>()

async function emSerieDoUsuario<T>(
  usuario: string,
  tarefa: () => Promise<T>
): Promise<T> {
  const anterior = tentativasEmCurso.get(usuario)
  let liberar: () => void = () => undefined
  const minhaVez = new Promise<void>((resolve) => {
    liberar = resolve
  })
  tentativasEmCurso.set(usuario, minhaVez)
  try {
    await anterior
    return await tarefa()
  } finally {
    liberar()
    if (tentativasEmCurso.get(usuario) === minhaVez) {
      tentativasEmCurso.delete(usuario)
    }
  }
}

// Cada usuário é atendido em série; o fluxo de uma tentativa está em `tentarEntrar`.
export async function entrar(
  usuario: string,
  senha: string,
  agora: Date,
  requestId: string
): Promise<ResultadoEntrar> {
  const usuarioNormalizado = normalizarUsuario(usuario)
  await limparRegistrosAntigos(agora)
  return emSerieDoUsuario(usuarioNormalizado, () =>
    tentarEntrar(usuarioNormalizado, senha, agora, requestId)
  )
}

// Ordem (TechSpec §3): bloqueio (quem está bloqueado nem tem a senha verificada) → conta → senha → tentativa → sessão.
async function tentarEntrar(
  usuarioNormalizado: string,
  senha: string,
  agora: Date,
  requestId: string
): Promise<ResultadoEntrar> {
  const ambiente = lerAmbiente()
  const limites = limitesDe(ambiente)
  const tentativas = await listarTentativasDesde(
    usuarioNormalizado,
    inicioDaConsulta(agora, limites)
  )
  const bloqueio = avaliarBloqueio(tentativas, agora, limites)
  if (bloqueio.bloqueado) {
    log.warn("auth.login_bloqueado", {
      requestId,
      usuario: usuarioNormalizado,
      resultado: "bloqueado",
    })
    return { tipo: "bloqueado", esperaMinutos: bloqueio.esperaMinutos }
  }

  const conta = buscarConta(usuarioNormalizado, ambiente)
  const senhaConfere = await verificarSenha(
    senha,
    conta?.senhaHash ?? (await obterHashFicticio())
  )
  const sucesso = conta !== undefined && senhaConfere
  await registrarTentativa({
    usuario: usuarioNormalizado,
    sucesso,
    ocorridaEm: agora,
  })

  if (!conta || !senhaConfere) {
    log.warn("auth.login_falha", {
      requestId,
      usuario: usuarioNormalizado,
      resultado: "credenciais-invalidas",
    })
    return { tipo: "credenciais-invalidas" }
  }

  const { token, sessao } = await criarSessao(conta, agora)
  log.info("auth.login_sucesso", {
    requestId,
    usuario: sessao.usuario,
    resultado: "sucesso",
  })
  return { tipo: "sucesso", token, sessao }
}
