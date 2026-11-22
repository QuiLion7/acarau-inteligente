import "server-only"

import { ErroApi } from "@/lib/server/http/erro-api"
import { registrarEvento } from "@/lib/server/auditoria/registrar-evento"

export type OperacaoDeObra = {
  requestId: string
  usuario: string
  operacao: "criar" | "editar"
  /** Só quando o id da rota é um uuid válido: um segmento qualquer da URL não entra no log. */
  obraId?: string
  agora: Date
}

/**
 * Registra `obra.recusada` (log + auditoria) (TechSpec §10, RF-04.35) quando a operação é recusada pelo servidor (validação, limite,
 * não encontrada) e relança o erro: o envelope continua sendo do `rotaApi`. Título, descrição e secretaria nunca vão
 * ao log. Falha inesperada não passa aqui: o `rotaApi` a registra uma vez como `http.erro`.
 */
export async function registrandoRecusaDeObra<Resultado>(
  { requestId, usuario, operacao, obraId, agora }: OperacaoDeObra,
  executar: () => Promise<Resultado>
): Promise<Resultado> {
  try {
    return await executar()
  } catch (erro) {
    if (erro instanceof ErroApi) {
      await registrarEvento(
        {
          tipo: "obra_recusada",
          requestId,
          conta: usuario,
          alvo: obraId ? { tipo: "obra", id: obraId } : null,
          detalhes: { motivo: erro.code },
          camposLog: {
            requestId,
            usuario,
            obraId,
            operacao,
            motivo: erro.code,
          },
        },
        { agora }
      )
    }
    throw erro
  }
}
