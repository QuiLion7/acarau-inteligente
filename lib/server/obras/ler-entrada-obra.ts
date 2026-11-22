import "server-only"

import type { NextRequest } from "next/server"

import { ErroApi } from "@/lib/server/http/erro-api"
import {
  obraEntradaSchema,
  type ObraEntrada,
} from "@/lib/validations/obra-schema"

async function lerCorpoJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    // Corpo ausente ou que não é JSON cai na validação, que responde 400 no envelope.
    return undefined
  }
}

/**
 * O corpo do `POST` e do `PUT` como `ObraEntrada` (RF-04.21): o mesmo schema do formulário, que descarta chaves
 * desconhecidas (`bairroId`, `proveniencia`). O erro sai por campo (`localizacao` junta latitude e longitude) com a
 * mensagem do schema, nunca o valor enviado (seguranca.md §6).
 */
export async function lerEntradaDeObra(
  request: NextRequest
): Promise<ObraEntrada> {
  const corpo = obraEntradaSchema.safeParse(await lerCorpoJson(request))
  if (corpo.success) return corpo.data
  const campos: Record<string, string> = {}
  for (const problema of corpo.error.issues) {
    campos[String(problema.path[0] ?? "corpo")] ??= problema.message
  }
  throw new ErroApi("VALIDACAO", { details: { campos } })
}
