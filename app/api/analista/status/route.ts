import { NextResponse } from "next/server"

import { rotaApi } from "@/lib/server/http/rota-api"

// Operação restrita mínima (RF-00.27): devolve só a identificação da sessão. Molde das rotas de analista do EP-02/04.
export const GET = rotaApi(
  async (_request, { sessao }) => NextResponse.json(sessao),
  { papel: "analista" }
)
