import "server-only"

import { ErroApi } from "@/lib/server/http/erro-api"
import { log } from "@/lib/server/log"

export type OperacaoDeObra = {
  requestId: string
  usuario: string
  operacao: "criar" | "editar"
  /** Só quando o id da rota é um uuid válido: um segmento qualquer da URL não entra no log. */
  obraId?: string
}

/**
 * Registra `obra.recusada` (TechSpec §10, RF-04.35) quando a operação é recusada pelo servidor (validação, limite,
 * não encontrada) e relança o erro: o envelope continua sendo do `rotaApi`. Título, descrição e secretaria nunca vão
 * ao log. Falha inesperada não passa aqui: o `rotaApi` a registra uma vez como `http.erro`.
 */
export async function registrandoRecusaDeObra<Resultado>(
  { requestId, usuario, operacao, obraId }: OperacaoDeObra,
  executar: () => Promise<Resultado>
): Promise<Resultado> {
  try {
    return await executar()
  } catch (erro) {
    if (erro instanceof ErroApi) {
      log.warn("obra.recusada", {
        requestId,
        usuario,
        obraId,
        operacao,
        motivo: erro.code,
      })
    }
    throw erro
  }
}
