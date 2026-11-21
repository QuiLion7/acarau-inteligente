import { reiniciarDemonstracao } from "@/lib/server/demo/reset-servico"
import { obterBanco } from "@/lib/server/db/cliente"
import { ErroApi } from "@/lib/server/http/erro-api"
import { rotaApi } from "@/lib/server/http/rota-api"
import { log } from "@/lib/server/log"

// Reinicia a demonstração (RF-02.43): só o administrador, com `Origin` conferida; o analista recebe 403. Sem corpo,
// responde 204, e repetir leva ao mesmo estado (CA-02.29).
export const POST = rotaApi(
  async (_request, { requestId, sessao, agora }) => {
    // `papel` garante a sessão; sem ela o `rotaApi` já respondeu 401.
    if (!sessao) throw new ErroApi("NAO_AUTENTICADO")
    const { datasetsRemovidos } = await reiniciarDemonstracao(
      obterBanco(),
      agora
    )
    log.info("demo.reset", {
      requestId,
      usuario: sessao.usuario,
      datasetsRemovidos,
    })
    return new Response(null, { status: 204 })
  },
  { papel: "administrador", escrita: true }
)
