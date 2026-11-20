import { NextResponse, type NextRequest } from "next/server"

import { lerAmbiente } from "@/lib/config/ambiente"
import { definirCookieSessao } from "@/lib/server/auth/cookie-sessao"
import { entrar } from "@/lib/server/auth/login-servico"
import { ErroApi, respostaDeErro } from "@/lib/server/http/erro-api"
import { rotaApi } from "@/lib/server/http/rota-api"
import { entrarSchema } from "@/lib/validations/entrar-schema"

const SEGUNDOS_POR_MINUTO = 60

async function lerCorpoJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    // Corpo ausente ou que não é JSON cai na validação, que responde 400 no envelope.
    return undefined
  }
}

function textoDaEspera(minutos: number): string {
  return minutos === 1 ? "1 minuto" : `${minutos} minutos`
}

// Público de propósito: é a porta de entrada. Escrita, então confere a origem; o bloqueio por usuário fica no serviço.
export const POST = rotaApi(
  async (request, { requestId, agora }) => {
    const corpo = entrarSchema.safeParse(await lerCorpoJson(request))
    if (!corpo.success) {
      // Só o nome do campo e a mensagem do schema: nunca eco do valor enviado (seguranca.md §6).
      const campos: Record<string, string> = {}
      for (const problema of corpo.error.issues) {
        campos[String(problema.path[0] ?? "corpo")] ??= problema.message
      }
      throw new ErroApi("VALIDACAO", { details: { campos } })
    }

    const resultado = await entrar(
      corpo.data.usuario,
      corpo.data.senha,
      agora,
      requestId
    )
    if (resultado.tipo === "credenciais-invalidas") {
      throw new ErroApi("CREDENCIAIS_INVALIDAS")
    }
    if (resultado.tipo === "bloqueado") {
      const erro = new ErroApi("LOGIN_BLOQUEADO", {
        message: `Muitas tentativas. Tente novamente em ${textoDaEspera(resultado.esperaMinutos)}.`,
        details: { esperaMinutos: resultado.esperaMinutos },
      })
      return respostaDeErro(erro, requestId, {
        "Retry-After": String(resultado.esperaMinutos * SEGUNDOS_POR_MINUTO),
      })
    }

    const resposta = NextResponse.json(resultado.sessao)
    definirCookieSessao(resposta, resultado.token, lerAmbiente().APP_URL)
    return resposta
  },
  { escrita: true }
)
