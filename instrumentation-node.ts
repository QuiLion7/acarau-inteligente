import type { Instrumentation } from "next"

import { ErroAmbiente, lerAmbiente } from "@/lib/config/ambiente"
import { obterBanco } from "@/lib/server/db/cliente"
import { garantirPreCarregadoRegistrando } from "@/lib/server/demo/dataset-pre-carregado"
import { garantirObrasPreCarregadasRegistrando } from "@/lib/server/obras/obras-pre-carregadas"
import { log } from "@/lib/server/log"

const FASE_BUILD = "phase-production-build"

// O build não pode exigir ambiente: a imagem Docker não o tem. Com o ambiente válido, grava o dataset e as obras de
// exemplo que ainda não existem (RF-02.41, RF-04.29); uma falha da carga fica no log e não derruba a subida (R-04).
export async function validarAmbienteNaSubida(): Promise<void> {
  if (process.env.NEXT_PHASE === FASE_BUILD) return
  try {
    lerAmbiente()
  } catch (erro) {
    if (!(erro instanceof ErroAmbiente)) throw erro
    log.error("config.invalida", { variaveis: erro.variaveis })
    return process.exit(1)
  }
  const banco = obterBanco()
  await garantirPreCarregadoRegistrando(banco, new Date())
  await garantirObrasPreCarregadasRegistrando(banco)
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
