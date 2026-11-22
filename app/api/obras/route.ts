import { NextResponse } from "next/server"

import { obterBanco } from "@/lib/server/db/cliente"
import { ErroApi } from "@/lib/server/http/erro-api"
import { rotaApi } from "@/lib/server/http/rota-api"
import { registrarEvento } from "@/lib/server/auditoria/registrar-evento"
import { lerEntradaDeObra } from "@/lib/server/obras/ler-entrada-obra"
import { registrandoRecusaDeObra } from "@/lib/server/obras/log-obra"
import { criarObra } from "@/lib/server/obras/obra-servico"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

// Cria obra sintética (RF-04.21, DV-42): analista ou acima, com `Origin` conferida. O bairro e a origem são do
// servidor; o corpo só traz o `ObraEntrada`. Não há `GET` (a leitura é do Server Component), `DELETE` nem `PATCH`.
export const POST = rotaApi(
  async (request, { requestId, sessao, agora }) => {
    // `papel` garante a sessão; sem ela o `rotaApi` já respondeu 401.
    if (!sessao) throw new ErroApi("NAO_AUTENTICADO")
    const { usuario } = sessao
    return registrandoRecusaDeObra(
      { requestId, usuario, operacao: "criar", agora },
      async () => {
        const entrada = await lerEntradaDeObra(request)
        const obra = await criarObra(obterBanco(), entrada, {
          autor: sessao,
          agora,
          territorio: obterDadosTerritorio(),
        })
        await registrarEvento(
          {
            tipo: "obra_criada",
            requestId,
            conta: usuario,
            alvo: { tipo: "obra", id: obra.id },
            camposLog: {
              requestId,
              usuario,
              obraId: obra.id,
              situacao: obra.situacao,
              estadoLocalizacao: obra.estadoLocalizacao,
            },
          },
          { agora }
        )
        return NextResponse.json(obra, { status: 201 })
      }
    )
  },
  { papel: "analista", escrita: true }
)
