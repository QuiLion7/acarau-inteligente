import "server-only"

import { ErroApi } from "@/lib/server/http/erro-api"
import { log } from "@/lib/server/log"

// Eventos de auditoria da importação (TechSpec §10, DV-09): o usuário pode aparecer; conteúdo de célula, nome de
// arquivo, nome de coluna e cabeçalho nunca (seguranca §9, §13).

type Autoria = { requestId: string; usuario: string }

function linhaDaRecusa(erro: ErroApi): number | undefined {
  const recusa = erro.details?.recusa
  const linha =
    typeof recusa === "object" && recusa !== null && "linha" in recusa
      ? recusa.linha
      : undefined
  return typeof linha === "number" ? linha : undefined
}

function codigoDaRecusa(erro: ErroApi): string {
  const recusa = erro.details?.recusa
  const motivo =
    typeof recusa === "object" && recusa !== null && "motivo" in recusa
      ? recusa.motivo
      : undefined
  return typeof motivo === "string" ? motivo : erro.code
}

function datasetDaDuplicata(erro: ErroApi): string | undefined {
  const datasetId = erro.details?.datasetId
  return typeof datasetId === "string" ? datasetId : undefined
}

/** Registra recusa e duplicata; qualquer outra falha é do `rotaApi` (`http.erro`), que registra uma vez só. */
export function registrarFalhaDeImportacao(
  erro: unknown,
  autoria: Autoria
): void {
  if (!(erro instanceof ErroApi)) return
  if (erro.code === "CONTEUDO_JA_IMPORTADO") {
    log.info("importacao.duplicada", {
      ...autoria,
      datasetId: datasetDaDuplicata(erro),
    })
    return
  }
  if (
    erro.code === "IMPORTACAO_INVALIDA" ||
    erro.code === "ARQUIVO_GRANDE_DEMAIS"
  ) {
    log.warn("importacao.recusada", {
      ...autoria,
      codigo: codigoDaRecusa(erro),
      linha: linhaDaRecusa(erro),
    })
  }
}
