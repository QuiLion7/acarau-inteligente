import type { Instrumentation } from "next"

// A parte de Node fica em outro arquivo: o Next analisa este para o Edge e recusa `process.exit` aqui.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { validarAmbienteNaSubida } = await import("./instrumentation-node")
  await validarAmbienteNaSubida()
}

export const onRequestError: Instrumentation.onRequestError = async (
  erro,
  request,
  contexto
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { registrarErroDeRequisicao } = await import("./instrumentation-node")
  await registrarErroDeRequisicao(erro, request, contexto)
}
