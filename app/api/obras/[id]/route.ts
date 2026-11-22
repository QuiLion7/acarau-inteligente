import { NextResponse } from "next/server"

import { obterBanco } from "@/lib/server/db/cliente"
import { ErroApi } from "@/lib/server/http/erro-api"
import { rotaApi } from "@/lib/server/http/rota-api"
import { log } from "@/lib/server/log"
import { lerEntradaDeObra } from "@/lib/server/obras/ler-entrada-obra"
import { registrandoRecusaDeObra } from "@/lib/server/obras/log-obra"
import { editarObra } from "@/lib/server/obras/obra-servico"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"
import { idObraSchema } from "@/lib/validations/obra-schema"

// Substitui os campos editáveis da obra (RF-04.22, DEC-T-06): mesma proteção do `POST`. Id mal formado responde 404,
// como o inexistente (não revela o formato). Sem `DELETE` nem `PATCH`: obra não se exclui e o histórico não tem rota.
export const PUT = rotaApi(
  async (request, { requestId, sessao, agora, parametros }) => {
    if (!sessao) throw new ErroApi("NAO_AUTENTICADO")
    const { usuario } = sessao
    const { id } = await parametros()
    const idLido = idObraSchema.safeParse(id)
    const obraId = idLido.success ? idLido.data : undefined
    return registrandoRecusaDeObra(
      { requestId, usuario, operacao: "editar", obraId },
      async () => {
        const entrada = await lerEntradaDeObra(request)
        if (!obraId) throw new ErroApi("NAO_ENCONTRADO")
        const { obra, situacaoAlterada } = await editarObra(
          obterBanco(),
          obraId,
          entrada,
          { autor: sessao, agora, territorio: obterDadosTerritorio() }
        )
        log.info("obra.editada", {
          requestId,
          usuario,
          obraId: obra.id,
          situacaoAlterada,
        })
        return NextResponse.json(obra)
      }
    )
  },
  { papel: "analista", escrita: true }
)
