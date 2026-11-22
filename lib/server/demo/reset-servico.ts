import "server-only"

import { garantirDatasetPreCarregado } from "@/lib/server/demo/dataset-pre-carregado"
import type { Banco } from "@/lib/server/db/cliente"
import { dataset, obra } from "@/lib/server/db/schema"
import { garantirObrasPreCarregadas } from "@/lib/server/obras/obras-pre-carregadas"

/**
 * Reinicia a demonstração (RF-02.43, RF-04.31, DEC-T-10): apaga todos os datasets (versões e linhas em cascata) e
 * todas as obras (histórico em cascata) e recarrega o dataset e as obras de exemplo, tudo na mesma transação: ou
 * tudo volta, ou nada muda. Repetir dá o mesmo estado, e o território (GeoJSON versionado) nem é tocado (RN-02.14).
 */
export async function reiniciarDemonstracao(
  banco: Banco,
  agora: Date
): Promise<{ datasetsRemovidos: number; obrasRemovidas: number }> {
  return banco.transaction(async (transacao) => {
    const datasets = await transacao
      .delete(dataset)
      .returning({ id: dataset.id })
    const obras = await transacao.delete(obra).returning({ id: obra.id })
    await garantirDatasetPreCarregado(transacao, agora)
    await garantirObrasPreCarregadas(transacao)
    return {
      datasetsRemovidos: datasets.length,
      obrasRemovidas: obras.length,
    }
  })
}
