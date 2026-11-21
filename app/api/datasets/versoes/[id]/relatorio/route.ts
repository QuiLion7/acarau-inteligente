import { NextResponse } from "next/server"

import { obterRelatorio } from "@/lib/server/datasets/dataset-repositorio"
import { lerIdDaVersao } from "@/lib/server/datasets/ler-id-versao"
import { obterBanco } from "@/lib/server/db/cliente"
import { ErroApi } from "@/lib/server/http/erro-api"
import { rotaApi } from "@/lib/server/http/rota-api"

// Relatório de processamento da versão (RF-02.23): só analista ou acima.
export const GET = rotaApi(
  async (_request, { parametros }) => {
    const relatorio = await obterRelatorio(
      obterBanco(),
      await lerIdDaVersao(parametros)
    )
    if (!relatorio) throw new ErroApi("NAO_ENCONTRADO")
    return NextResponse.json(relatorio)
  },
  { papel: "analista" }
)
