import { NextResponse } from "next/server"

import { obterBanco } from "@/lib/server/db/cliente"
import { rotaApi } from "@/lib/server/http/rota-api"
import { verificarSaude } from "@/lib/server/saude"

// Público de propósito: healthcheck do compose e prova de que o banco responde (CA-00.01, CA-00.05).
export const GET = rotaApi(async (_request, { requestId }) => {
  const estado = await verificarSaude(obterBanco(), requestId)
  return NextResponse.json(estado, {
    status: estado.status === "ok" ? 200 : 503,
  })
})
