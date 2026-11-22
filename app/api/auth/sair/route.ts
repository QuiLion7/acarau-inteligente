import { NextResponse } from "next/server"

import { lerAmbiente } from "@/lib/config/ambiente"
import {
  expirarCookieSessao,
  lerTokenDoRequest,
} from "@/lib/server/auth/cookie-sessao"
import { encerrarSessao, validarSessao } from "@/lib/server/auth/sessao-servico"
import { rotaApi } from "@/lib/server/http/rota-api"
import { registrarEvento } from "@/lib/server/auditoria/registrar-evento"

// Público de propósito: sair sem sessão também é válido (idempotente). Escrita, então confere a origem.
export const POST = rotaApi(
  async (request, { requestId, agora }) => {
    const token = lerTokenDoRequest(request)
    const sessao = await validarSessao(token, agora)
    await encerrarSessao(token, agora)
    if (sessao) {
      await registrarEvento(
        {
          tipo: "logout",
          requestId,
          conta: sessao.usuario,
          camposLog: { requestId, usuario: sessao.usuario },
        },
        { agora }
      )
    }

    const resposta = new NextResponse(null, { status: 204 })
    expirarCookieSessao(resposta, lerAmbiente().APP_URL)
    return resposta
  },
  { escrita: true }
)
