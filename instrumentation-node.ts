import type { Instrumentation } from "next"

import { ErroAmbiente, lerAmbiente } from "@/lib/config/ambiente"
import { obterBanco } from "@/lib/server/db/cliente"
import { garantirPreCarregadoRegistrando } from "@/lib/server/demo/dataset-pre-carregado"
import { log } from "@/lib/server/log"

const FASE_BUILD = "phase-production-build"

// O build não pode exigir ambiente: a imagem Docker não o tem. Com o ambiente válido, grava o dataset de exemplo se
// ele ainda não existe (RF-02.41); uma falha da carga fica no log e não derruba a subida (R-04).
export async function validarAmbienteNaSubida(): Promise<void> {
  if (process.env.NEXT_PHASE === FASE_BUILD) return
  try {
    lerAmbiente()
  } catch (erro) {
    if (!(erro instanceof ErroAmbiente)) throw erro
    log.error("config.invalida", { variaveis: erro.variaveis })
    return process.exit(1)
  }
  await garantirPreCarregadoRegistrando(obterBanco(), new Date())
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
