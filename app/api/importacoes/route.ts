import { NextResponse } from "next/server"

import { confirmarImportacao } from "@/lib/server/datasets/importacao-servico"
import { lerRequisicaoDeImportacao } from "@/lib/server/datasets/ler-requisicao-importacao"
import { registrarFalhaDeImportacao } from "@/lib/server/datasets/log-importacao"
import { obterBanco } from "@/lib/server/db/cliente"
import { ErroApi } from "@/lib/server/http/erro-api"
import { rotaApi } from "@/lib/server/http/rota-api"
import { registrarEvento } from "@/lib/server/auditoria/registrar-evento"

// Confirma a importação (RF-02.19 a RF-02.22): multipart com `arquivo` e `dados`, só analista ou acima, com `Origin`
// conferida. A leitura confere o `Content-Length` antes de ler o corpo (DV-30).
export const POST = rotaApi(
  async (request, { requestId, sessao, agora }) => {
    // `papel` garante a sessão; sem ela o `rotaApi` já respondeu 401.
    if (!sessao) throw new ErroApi("NAO_AUTENTICADO")
    const inicio = performance.now()
    try {
      const { arquivo, dados } = await lerRequisicaoDeImportacao(request)
      const bytes = new Uint8Array(await arquivo.arrayBuffer())
      const gravada = await confirmarImportacao(obterBanco(), {
        arquivo: { nome: arquivo.name, bytes },
        dados,
        autor: { usuario: sessao.usuario, nome: sessao.nome },
        agora,
      })
      const { datasetId, versaoId, numero, linhasGravadas } = gravada
      await registrarEvento(
        {
          tipo: "importacao_confirmada",
          requestId,
          conta: sessao.usuario,
          alvo: { tipo: "dataset_versao", id: versaoId },
          detalhes: { numero, linhas: linhasGravadas },
          camposLog: {
            requestId,
            usuario: sessao.usuario,
            datasetId,
            versaoId,
            numero,
            linhas: linhasGravadas,
            duracaoMs: Math.round(performance.now() - inicio),
          },
        },
        { agora }
      )
      return NextResponse.json({ datasetId, versaoId, numero }, { status: 201 })
    } catch (erro) {
      await registrarFalhaDeImportacao(
        erro,
        { requestId, usuario: sessao.usuario },
        agora
      )
      throw erro
    }
  },
  { papel: "analista", escrita: true }
)
