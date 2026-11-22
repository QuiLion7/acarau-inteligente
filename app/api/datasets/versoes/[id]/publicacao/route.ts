import { NextResponse } from "next/server"

import {
  despublicarVersao,
  publicarVersao,
} from "@/lib/server/datasets/publicacao-servico"
import { lerIdDaVersao } from "@/lib/server/datasets/ler-id-versao"
import { obterBanco } from "@/lib/server/db/cliente"
import { ErroApi } from "@/lib/server/http/erro-api"
import { rotaApi } from "@/lib/server/http/rota-api"
import { registrarEvento } from "@/lib/server/auditoria/registrar-evento"

// Publicar e despublicar são ações explícitas do analista ou acima (RF-02.24, RF-02.26), com `Origin` conferida.
// Os dois são idempotentes (a repetição responde 200 sem mudança) e entram no log de auditoria (TechSpec §10).
export const POST = rotaApi(
  async (_request, { requestId, sessao, agora, parametros }) => {
    if (!sessao) throw new ErroApi("NAO_AUTENTICADO")
    const versaoId = await lerIdDaVersao(parametros)
    const versao = await publicarVersao(obterBanco(), versaoId, agora)
    await registrarEvento(
      {
        tipo: "versao_publicada",
        requestId,
        conta: sessao.usuario,
        alvo: { tipo: "dataset_versao", id: versaoId },
        camposLog: { requestId, usuario: sessao.usuario, versaoId },
      },
      { agora }
    )
    return NextResponse.json(versao)
  },
  { papel: "analista", escrita: true }
)

export const DELETE = rotaApi(
  async (_request, { requestId, sessao, agora, parametros }) => {
    if (!sessao) throw new ErroApi("NAO_AUTENTICADO")
    const versaoId = await lerIdDaVersao(parametros)
    const versao = await despublicarVersao(obterBanco(), versaoId)
    await registrarEvento(
      {
        tipo: "versao_despublicada",
        requestId,
        conta: sessao.usuario,
        alvo: { tipo: "dataset_versao", id: versaoId },
        camposLog: { requestId, usuario: sessao.usuario, versaoId },
      },
      { agora }
    )
    return NextResponse.json(versao)
  },
  { papel: "analista", escrita: true }
)
