import { NextResponse } from "next/server"

import { lerAmbiente } from "@/lib/config/ambiente"
import {
  expirarCookieSessao,
  lerTokenDoRequest,
} from "@/lib/server/auth/cookie-sessao"
import { encerrarSessao, validarSessao } from "@/lib/server/auth/sessao-servico"
import { rotaApi } from "@/lib/server/http/rota-api"
import { log } from "@/lib/server/log"

// Público de propósito: sair sem sessão também é válido (idempotente). Escrita, então confere a origem.
export const POST = rotaApi(
  async (request, { requestId, agora }) => {
    const token = lerTokenDoRequest(request)
    const sessao = await validarSessao(token, agora)
    await encerrarSessao(token, agora)
    if (sessao) log.info("auth.logout", { requestId, usuario: sessao.usuario })

    const resposta = new NextResponse(null, { status: 204 })
    expirarCookieSessao(resposta, lerAmbiente().APP_URL)
    return resposta
  },
  { escrita: true }
)
