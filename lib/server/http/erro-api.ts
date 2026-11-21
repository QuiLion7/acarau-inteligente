import { NextResponse } from "next/server"

// Catálogo de códigos (TechSpec §5, DV-08): código novo entra aqui, em MAIÚSCULAS.
const CATALOGO = {
  VALIDACAO: { status: 400, mensagem: "Os dados enviados são inválidos." },
  CREDENCIAIS_INVALIDAS: {
    status: 401,
    mensagem: "Usuário ou senha inválidos.",
  },
  NAO_AUTENTICADO: { status: 401, mensagem: "Entre para acessar esta área." },
  SEM_PERMISSAO: {
    status: 403,
    mensagem: "Você não tem permissão para acessar esta área.",
  },
  ORIGEM_INVALIDA: {
    status: 403,
    mensagem: "A origem da requisição não é permitida.",
  },
  NAO_ENCONTRADO: { status: 404, mensagem: "Recurso não encontrado." },
  CONTEUDO_JA_IMPORTADO: {
    status: 409,
    mensagem: "Este arquivo já foi importado.",
  },
  ARQUIVO_GRANDE_DEMAIS: {
    status: 413,
    mensagem: "O arquivo é maior que o limite de 5 MB.",
  },
  IMPORTACAO_INVALIDA: {
    status: 422,
    mensagem:
      "A importação não pôde ser confirmada: o arquivo ou as escolhas feitas não passam na validação.",
  },
  LOGIN_BLOQUEADO: {
    status: 429,
    mensagem: "Muitas tentativas. Tente novamente mais tarde.",
  },
  ERRO_INTERNO: {
    status: 500,
    mensagem: "Ocorreu um erro inesperado. Tente novamente em instantes.",
  },
  SERVICO_INDISPONIVEL: {
    status: 503,
    mensagem: "O serviço está indisponível no momento.",
  },
} as const

export type CodigoErro = keyof typeof CATALOGO

export const HEADER_REQUEST_ID = "x-request-id"

// Só dado seguro: nunca eco do valor enviado, stack, SQL nem mensagem de driver (seguranca.md §8).
export type DetalhesErro = Record<string, unknown>

export type RespostaErro = {
  code: CodigoErro
  message: string
  details?: DetalhesErro
  requestId: string
}

type OpcoesErro = { message?: string; details?: DetalhesErro }

export class ErroApi extends Error {
  readonly code: CodigoErro
  readonly status: number
  readonly details?: DetalhesErro

  constructor(code: CodigoErro, opcoes: OpcoesErro = {}) {
    super(opcoes.message ?? CATALOGO[code].mensagem)
    this.name = "ErroApi"
    this.code = code
    this.status = CATALOGO[code].status
    this.details = opcoes.details
  }
}

type CabecalhosExtras = Record<string, string>

export function respostaDeErro(
  erro: ErroApi,
  requestId: string,
  cabecalhos?: CabecalhosExtras
): NextResponse<RespostaErro> {
  const corpo: RespostaErro = {
    code: erro.code,
    message: erro.message,
    ...(erro.details && { details: erro.details }),
    requestId,
  }
  return NextResponse.json(corpo, { status: erro.status, headers: cabecalhos })
}
