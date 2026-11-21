import "server-only"

import { garantirDatasetPreCarregado } from "@/lib/server/demo/dataset-pre-carregado"
import type { Banco } from "@/lib/server/db/cliente"
import { dataset } from "@/lib/server/db/schema"

/**
 * Reinicia a demonstração (RF-02.43, DEC-T-10): apaga todos os datasets, com versões e linhas em cascata, e recarrega o
 * de exemplo, tudo na mesma transação. Repetir dá o mesmo estado, e o território (GeoJSON versionado) nem é tocado
 * (RN-02.14). O EP-04 acrescenta as obras aqui.
 */
export async function reiniciarDemonstracao(
  banco: Banco,
  agora: Date
): Promise<{ datasetsRemovidos: number }> {
  return banco.transaction(async (transacao) => {
    const removidos = await transacao
      .delete(dataset)
      .returning({ id: dataset.id })
    await garantirDatasetPreCarregado(transacao, agora)
    return { datasetsRemovidos: removidos.length }
  })
}
