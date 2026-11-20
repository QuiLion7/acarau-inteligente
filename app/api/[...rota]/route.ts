import { ErroApi } from "@/lib/server/http/erro-api"
import { rotaApi } from "@/lib/server/http/rota-api"

// Público de propósito: rota de API inexistente responde no envelope de erro, nunca no HTML do 404 de página.
const naoEncontrado = rotaApi(async () => {
  throw new ErroApi("NAO_ENCONTRADO")
})

export const GET = naoEncontrado
export const POST = naoEncontrado
export const PUT = naoEncontrado
export const PATCH = naoEncontrado
export const DELETE = naoEncontrado
export const OPTIONS = naoEncontrado
