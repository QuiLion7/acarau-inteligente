import { NextResponse } from "next/server"

import { rotaApi } from "@/lib/server/http/rota-api"

// Operação de administração mínima (RF-00.27): devolve só a identificação da sessão. Molde das rotas do EP-05.
export const GET = rotaApi(
  async (_request, { sessao }) => NextResponse.json(sessao),
  { papel: "administrador" }
)
