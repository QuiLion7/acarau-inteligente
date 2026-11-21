import "server-only"

import type { Transacao } from "@/lib/server/db/cliente"
import { datasetLinha } from "@/lib/server/db/schema"
import type { LinhaNormalizada } from "@/lib/importacao/tipos-importacao"

// 1.000 linhas por `insert`: 6 colunas por linha ficam bem abaixo do limite de parâmetros do Postgres (TechSpec §4.6).
const TAMANHO_DO_LOTE = 1000

/** Grava as linhas da versão em lotes, dentro da transação de quem chama (RF-02.19: tudo ou nada). */
export async function gravarLinhasEmLotes(
  transacao: Transacao,
  versaoId: string,
  linhas: readonly LinhaNormalizada[]
): Promise<void> {
  for (let inicio = 0; inicio < linhas.length; inicio += TAMANHO_DO_LOTE) {
    const lote = linhas.slice(inicio, inicio + TAMANHO_DO_LOTE)
    await transacao.insert(datasetLinha).values(
      lote.map((linha) => ({
        versaoId,
        linhaArquivo: linha.linhaArquivo,
        bairroId: linha.bairroId,
        nomeOriginal: linha.nomeOriginal,
        periodo: linha.periodo,
        casos: linha.casos,
      }))
    )
  }
}
