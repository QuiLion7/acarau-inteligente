import { HEADER_REQUEST_ID } from "@/lib/server/http/erro-api"

const FORMATO_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Só UUID entra no log e no header de resposta: valor livre do cliente permitiria injetar linhas no log.
export function obterRequestId(cabecalhos: Headers): string {
  const recebido = cabecalhos.get(HEADER_REQUEST_ID)
  return recebido && FORMATO_UUID.test(recebido)
    ? recebido
    : crypto.randomUUID()
}
