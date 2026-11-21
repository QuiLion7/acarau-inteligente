import "server-only"

import { ErroApi } from "@/lib/server/http/erro-api"
import type { ParametrosDaRota } from "@/lib/server/http/rota-api"
import { idVersaoSchema } from "@/lib/validations/datasets-schema"

/** O `[id]` da rota como uuid; qualquer outra coisa é 400 sem eco do valor (seguranca.md §6). */
export async function lerIdDaVersao(
  parametros: () => Promise<ParametrosDaRota>
): Promise<string> {
  const { id } = await parametros()
  const valido = idVersaoSchema.safeParse(id)
  if (!valido.success) {
    throw new ErroApi("VALIDACAO", {
      details: { campos: { id: "O identificador da versão é inválido." } },
    })
  }
  return valido.data
}
