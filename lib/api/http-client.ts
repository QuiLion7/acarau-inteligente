import { z } from "zod"

import { ApiError } from "@/lib/api/api-error"

type MetodoHttp = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

type OpcoesRequisicao = { metodo?: MetodoHttp; corpo?: unknown }

const MENSAGEM_SEM_CONEXAO =
  "Não foi possível falar com o servidor. Verifique a conexão e tente novamente."
const MENSAGEM_RESPOSTA_INESPERADA =
  "O servidor respondeu de um jeito inesperado. Tente novamente em instantes."

// Envelope de erro do servidor (TechSpec §4.5): validado na borda, não assumido por `as`.
const envelopeErroSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  requestId: z.string().optional(),
})

async function lerJsonOuNada(resposta: Response): Promise<unknown> {
  try {
    return await resposta.json()
  } catch {
    // Corpo vazio ou que não é JSON cai no erro genérico abaixo.
    return undefined
  }
}

async function erroDaResposta(resposta: Response): Promise<ApiError> {
  const corpo = envelopeErroSchema.safeParse(await lerJsonOuNada(resposta))
  if (!corpo.success) {
    return new ApiError("RESPOSTA_INESPERADA", MENSAGEM_RESPOSTA_INESPERADA, {
      status: resposta.status,
    })
  }
  return new ApiError(corpo.data.code, corpo.data.message, {
    status: resposta.status,
    details: corpo.data.details,
    requestId: corpo.data.requestId,
  })
}

// Chamada ao próprio app (mesma origem, cookie de sessão junto). Resposta fora de 2xx vira `ApiError`.
// O navegador manda o `Origin` que o servidor confere nas escritas (seguranca.md §4).
export async function requisitar(
  caminho: string,
  { metodo = "GET", corpo }: OpcoesRequisicao = {}
): Promise<Response> {
  let resposta: Response
  try {
    resposta = await fetch(caminho, {
      method: metodo,
      credentials: "same-origin",
      headers:
        corpo === undefined
          ? undefined
          : { "Content-Type": "application/json" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    })
  } catch (erro) {
    throw new ApiError("SEM_CONEXAO", MENSAGEM_SEM_CONEXAO, { cause: erro })
  }
  if (!resposta.ok) throw await erroDaResposta(resposta)
  return resposta
}
