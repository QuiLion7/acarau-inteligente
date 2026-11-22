import "server-only"

import { temPapel, type Papel } from "@/lib/auth/papeis"
import type { AnaliseDatasetSaude } from "@/lib/saude/analise-dataset"
import {
  lerSerieDaVersao,
  listarOpcoesDeVersao,
  obterVersaoVisivel,
} from "@/lib/server/datasets/dataset-repositorio"
import type { Banco } from "@/lib/server/db/cliente"

export type ResultadoAnaliseDataset =
  | { status: "ok"; analise: AnaliseDatasetSaude }
  | { status: "nenhum-dataset" }
  | { status: "nao-encontrada" }

/**
 * A versão da Saúde para o papel, com a série e as opções do seletor (DV-25, DEC-T-06). A visibilidade é decidida em
 * `obterVersaoVisivel`; só depois disso a série é lida, então uma versão privada nunca chega a quem não pode vê-la.
 */
export async function montarAnaliseDataset(
  banco: Banco,
  { versaoId, papel }: { versaoId: string | null; papel: Papel }
): Promise<ResultadoAnaliseDataset> {
  const visivel = await obterVersaoVisivel(banco, { versaoId, papel })
  if (visivel.status !== "ok") return { status: visivel.status }

  const { versao, dataset } = visivel
  const [serie, opcoes] = await Promise.all([
    lerSerieDaVersao(banco, versao.id),
    listarOpcoesDeVersao(banco, papel),
  ])
  const { id, numero, situacao, importadoEm, publicadoEm, granularidade } =
    versao
  const { nome, indicador, fonte, unidade, proveniencia } = dataset
  return {
    status: "ok",
    analise: {
      ...serie,
      versao: {
        id,
        numero,
        situacao,
        importadoEm,
        publicadoEm,
        granularidade,
      },
      dataset: { nome, indicador, fonte, unidade, proveniencia },
      opcoes,
      podeGerenciar: temPapel(papel, "analista"),
    },
  }
}
