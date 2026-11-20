import type { Instrumentation } from "next"

import { ErroAmbiente, lerAmbiente } from "@/lib/config/ambiente"
import { log } from "@/lib/server/log"

const FASE_BUILD = "phase-production-build"

// O build não pode exigir ambiente: a imagem Docker não o tem.
export async function validarAmbienteNaSubida(): Promise<void> {
  if (process.env.NEXT_PHASE === FASE_BUILD) return
  try {
    lerAmbiente()
  } catch (erro) {
    if (!(erro instanceof ErroAmbiente)) throw erro
    log.error("config.invalida", { variaveis: erro.variaveis })
    process.exit(1)
  }
}

function textoDoCabecalho(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor
}

export const registrarErroDeRequisicao: Instrumentation.onRequestError = async (
  erro,
  request,
  contexto
) => {
  const digest =
    typeof erro === "object" && erro !== null && "digest" in erro
      ? String(erro.digest)
      : undefined
  log.error("render.erro", {
    requestId: textoDoCabecalho(request.headers["x-request-id"]),
    rota: contexto.routePath,
    digest,
    erro,
  })
}
