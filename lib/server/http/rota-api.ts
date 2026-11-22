import "server-only"

import type { NextRequest } from "next/server"

import { lerAmbiente } from "@/lib/config/ambiente"
import {
  temPapel,
  type PapelRestrito,
  type SessaoValida,
} from "@/lib/auth/papeis"
import {
  ErroApi,
  HEADER_REQUEST_ID,
  respostaDeErro,
} from "@/lib/server/http/erro-api"
import { lerTokenDoRequest } from "@/lib/server/auth/cookie-sessao"
import { validarSessao } from "@/lib/server/auth/sessao-servico"
import { origemPermitida } from "@/lib/server/http/origem"
import { obterRequestId } from "@/lib/server/http/request-id"
import { log } from "@/lib/server/log"
import { registrarEvento } from "@/lib/server/auditoria/registrar-evento"

// Segmentos dinâmicos da rota (`[hash]`, `[id]`): o Next 16 entrega `params` como Promise no 2º argumento do handler.
export type ParametrosDaRota = Record<string, string | string[] | undefined>
type ContextoDoNext = { params: Promise<ParametrosDaRota> }

export type ContextoRota = {
  requestId: string
  sessao: SessaoValida | null
  agora: Date
  parametros: () => Promise<ParametrosDaRota>
}

export type OpcoesRota = { papel?: PapelRestrito; escrita?: boolean }

export type ManipuladorRota = (
  request: NextRequest,
  contexto: ContextoRota
) => Promise<Response>

// Dependências injetáveis: o relógio, a origem aceita, a leitura da sessão a partir do cookie do request e o registro
// da auditoria (acesso negado, RF-05.24).
export type DependenciasRota = {
  agora: () => Date
  registrarEvento: typeof registrarEvento
  appUrl: () => string
  obterSessao: (
    request: NextRequest,
    agora: Date
  ) => Promise<SessaoValida | null>
}

// Sem cookie ou com sessão inválida o resultado é `null`, e `exigirSessao` nega (seguranca.md §2).
const obterSessaoDoRequest: DependenciasRota["obterSessao"] = (
  request,
  agora
) => validarSessao(lerTokenDoRequest(request), agora)

const dependenciasPadrao: DependenciasRota = {
  agora: () => new Date(),
  registrarEvento,
  appUrl: () => lerAmbiente().APP_URL,
  obterSessao: obterSessaoDoRequest,
}

async function recusarAcesso(
  motivo: "nao-autenticado" | "sem-permissao",
  request: NextRequest,
  contexto: Pick<ContextoRota, "requestId" | "agora">,
  sessao: SessaoValida | null,
  dependencias: DependenciasRota
): Promise<never> {
  const { requestId, agora } = contexto
  const rota = request.nextUrl.pathname
  await dependencias.registrarEvento(
    {
      tipo: "acesso_negado",
      requestId,
      conta: sessao?.usuario ?? null,
      detalhes: { rota, motivo },
      camposLog: { requestId, rota, motivo, usuario: sessao?.usuario },
    },
    { agora }
  )
  throw new ErroApi(
    motivo === "nao-autenticado" ? "NAO_AUTENTICADO" : "SEM_PERMISSAO"
  )
}

async function exigirSessao(
  request: NextRequest,
  contexto: Pick<ContextoRota, "requestId" | "agora">,
  papelMinimo: PapelRestrito,
  dependencias: DependenciasRota
): Promise<SessaoValida> {
  const sessao = await dependencias.obterSessao(request, contexto.agora)
  if (!sessao) {
    return recusarAcesso(
      "nao-autenticado",
      request,
      contexto,
      null,
      dependencias
    )
  }
  if (!temPapel(sessao.papel, papelMinimo)) {
    return recusarAcesso(
      "sem-permissao",
      request,
      contexto,
      sessao,
      dependencias
    )
  }
  return sessao
}

function respostaDeExcecao(
  erro: unknown,
  request: NextRequest,
  requestId: string
): Response {
  if (erro instanceof ErroApi) return respostaDeErro(erro, requestId)
  // Registrado uma vez, aqui; o stack fica só no log (seguranca.md §8, §9).
  log.error("http.erro", {
    requestId,
    metodo: request.method,
    rota: request.nextUrl.pathname,
    erro,
  })
  return respostaDeErro(new ErroApi("ERRO_INTERNO"), requestId)
}

function comCabecalhosPadrao(resposta: Response, requestId: string): Response {
  resposta.headers.set("Cache-Control", "no-store")
  resposta.headers.set(HEADER_REQUEST_ID, requestId)
  return resposta
}

export function criarRotaApi(dependencias: DependenciasRota) {
  return function rotaApi(
    manipulador: ManipuladorRota,
    opcoes: OpcoesRota = {}
  ): (
    request: NextRequest,
    contextoDoNext?: ContextoDoNext
  ) => Promise<Response> {
    return async (request, contextoDoNext) => {
      const requestId = obterRequestId(request.headers)
      const agora = dependencias.agora()
      try {
        if (
          opcoes.escrita &&
          !origemPermitida(request, dependencias.appUrl())
        ) {
          throw new ErroApi("ORIGEM_INVALIDA")
        }
        const sessao = opcoes.papel
          ? await exigirSessao(
              request,
              { requestId, agora },
              opcoes.papel,
              dependencias
            )
          : null
        const resposta = await manipulador(request, {
          requestId,
          sessao,
          agora,
          parametros: async () => (await contextoDoNext?.params) ?? {},
        })
        return comCabecalhosPadrao(resposta, requestId)
      } catch (erro) {
        return comCabecalhosPadrao(
          respostaDeExcecao(erro, request, requestId),
          requestId
        )
      }
    }
  }
}

export const rotaApi = criarRotaApi(dependenciasPadrao)
