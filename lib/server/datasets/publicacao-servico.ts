import "server-only"

import { and, eq, ne } from "drizzle-orm"

import { obterVersaoResumo } from "@/lib/server/datasets/dataset-repositorio"
import type { Executor, Transacao } from "@/lib/server/db/cliente"
import { dataset, datasetVersao } from "@/lib/server/db/schema"
import { ErroApi } from "@/lib/server/http/erro-api"
import type { VersaoResumo } from "@/lib/validations/datasets-schema"

// Trava o dataset da versão (`for update`): duas publicações simultâneas do mesmo dataset se enfileiram e a segunda
// vê o resultado da primeira, em vez de esbarrar no índice único de "uma publicada por dataset" (RF-02.24).
async function travarDatasetDaVersao(
  transacao: Transacao,
  versaoId: string
): Promise<{ datasetId: string; versao: VersaoResumo }> {
  const [encontrada] = await transacao
    .select({ datasetId: datasetVersao.datasetId })
    .from(datasetVersao)
    .where(eq(datasetVersao.id, versaoId))
  if (!encontrada) throw new ErroApi("NAO_ENCONTRADO")
  await transacao
    .select({ id: dataset.id })
    .from(dataset)
    .where(eq(dataset.id, encontrada.datasetId))
    .for("update")
  const versao = await lerDentroDaTransacao(transacao, versaoId)
  return { datasetId: encontrada.datasetId, versao }
}

async function lerDentroDaTransacao(
  leitor: Executor,
  versaoId: string
): Promise<VersaoResumo> {
  const versao = await obterVersaoResumo(leitor, versaoId)
  // A versão existia um instante atrás e a transação a trava: só some se for apagada no meio.
  if (!versao) throw new ErroApi("NAO_ENCONTRADO")
  return versao
}

/**
 * Publica a versão e despublica a outra publicada do mesmo dataset, na mesma transação (RF-02.24): o visitante vê
 * uma versão só, nunca a soma de duas. Idempotente: publicar uma versão já publicada não muda nada.
 */
export async function publicarVersao(
  banco: Executor,
  versaoId: string,
  agora: Date
): Promise<VersaoResumo> {
  return banco.transaction(async (transacao) => {
    const { datasetId, versao } = await travarDatasetDaVersao(
      transacao,
      versaoId
    )
    if (versao.situacao === "publicado") return versao
    await transacao
      .update(datasetVersao)
      .set({ situacao: "privado", publicadoEm: null })
      .where(
        and(
          eq(datasetVersao.datasetId, datasetId),
          eq(datasetVersao.situacao, "publicado"),
          ne(datasetVersao.id, versaoId)
        )
      )
    await transacao
      .update(datasetVersao)
      .set({ situacao: "publicado", publicadoEm: agora })
      .where(eq(datasetVersao.id, versaoId))
    return lerDentroDaTransacao(transacao, versaoId)
  })
}

/** Volta a versão para privada (RF-02.26). Idempotente: despublicar uma versão privada não muda nada. */
export async function despublicarVersao(
  banco: Executor,
  versaoId: string
): Promise<VersaoResumo> {
  return banco.transaction(async (transacao) => {
    const { versao } = await travarDatasetDaVersao(transacao, versaoId)
    if (versao.situacao === "privado") return versao
    await transacao
      .update(datasetVersao)
      .set({ situacao: "privado", publicadoEm: null })
      .where(eq(datasetVersao.id, versaoId))
    return lerDentroDaTransacao(transacao, versaoId)
  })
}
