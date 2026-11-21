import { NextResponse } from "next/server"

import { buscarVersaoPorHash } from "@/lib/server/datasets/dataset-repositorio"
import { obterBanco } from "@/lib/server/db/cliente"
import { ErroApi } from "@/lib/server/http/erro-api"
import { rotaApi } from "@/lib/server/http/rota-api"
import { hashConteudoSchema } from "@/lib/validations/importacao-schema"

// O conteúdo já foi importado? (RF-02.21, CA-02.14): o assistente consulta o SHA-256 dos bytes no passo de envio. Só
// analista ou acima; cancelar não grava nada, então reenviar depois responde `importado: false` (CA-02.35).
export const GET = rotaApi(
  async (_request, { parametros }) => {
    const { hash } = await parametros()
    const valido = hashConteudoSchema.safeParse(hash)
    if (!valido.success) {
      throw new ErroApi("VALIDACAO", {
        details: {
          campos: {
            hash: "O hash deve ser um SHA-256 em hexadecimal minúsculo.",
          },
        },
      })
    }
    const existente = await buscarVersaoPorHash(obterBanco(), valido.data)
    if (!existente) return NextResponse.json({ importado: false })
    const { datasetId, nome, numero } = existente
    return NextResponse.json({ importado: true, datasetId, nome, numero })
  },
  { papel: "analista" }
)
