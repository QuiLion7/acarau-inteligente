import "server-only"

import { ErroApi } from "@/lib/server/http/erro-api"
import { registrarEvento } from "@/lib/server/auditoria/registrar-evento"

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
export async function registrarFalhaDeImportacao(
  erro: unknown,
  autoria: Autoria,
  agora: Date
): Promise<void> {
  if (!(erro instanceof ErroApi)) return
  const { requestId, usuario } = autoria
  if (erro.code === "CONTEUDO_JA_IMPORTADO") {
    await registrarEvento(
      {
        tipo: "importacao_duplicada",
        requestId,
        conta: usuario,
        camposLog: { ...autoria, datasetId: datasetDaDuplicata(erro) },
      },
      { agora }
    )
    return
  }
  if (
    erro.code === "IMPORTACAO_INVALIDA" ||
    erro.code === "ARQUIVO_GRANDE_DEMAIS"
  ) {
    const codigo = codigoDaRecusa(erro)
    await registrarEvento(
      {
        tipo: "importacao_recusada",
        requestId,
        conta: usuario,
        detalhes: { codigo },
        camposLog: { ...autoria, codigo, linha: linhaDaRecusa(erro) },
      },
      { agora }
    )
  }
}
