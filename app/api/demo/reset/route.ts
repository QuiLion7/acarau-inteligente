import { reiniciarDemonstracao } from "@/lib/server/demo/reset-servico"
import { obterBanco } from "@/lib/server/db/cliente"
import { ErroApi } from "@/lib/server/http/erro-api"
import { rotaApi } from "@/lib/server/http/rota-api"
import { registrarEvento } from "@/lib/server/auditoria/registrar-evento"

// Reinicia a demonstração (RF-02.43, RF-04.31): datasets e obras; só o administrador, com `Origin` conferida; o analista recebe 403. Sem corpo,
// responde 204, e repetir leva ao mesmo estado (CA-02.29).
export const POST = rotaApi(
  async (_request, { requestId, sessao, agora }) => {
    // `papel` garante a sessão; sem ela o `rotaApi` já respondeu 401.
    if (!sessao) throw new ErroApi("NAO_AUTENTICADO")
    const { datasetsRemovidos, obrasRemovidas } = await reiniciarDemonstracao(
      obterBanco(),
      agora
    )
    // A auditoria não é tocada pelo reset (RN-05.07); o evento é gravado depois do commit dele.
    await registrarEvento(
      {
        tipo: "demo_reiniciada",
        requestId,
        conta: sessao.usuario,
        detalhes: { datasetsRemovidos, obrasRemovidas },
        camposLog: {
          requestId,
          usuario: sessao.usuario,
          datasetsRemovidos,
          obrasRemovidas,
        },
      },
      { agora }
    )
    return new Response(null, { status: 204 })
  },
  { papel: "administrador", escrita: true }
)
