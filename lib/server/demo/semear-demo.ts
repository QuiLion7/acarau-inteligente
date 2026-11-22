import "server-only"

import type { Executor } from "@/lib/server/db/cliente"
import { garantirDatasetPreCarregado } from "@/lib/server/demo/dataset-pre-carregado"
import { log } from "@/lib/server/log"
import { garantirObrasPreCarregadas } from "@/lib/server/obras/obras-pre-carregadas"

/**
 * Garante o dataset e as obras de exemplo no ambiente publicado (RF-05.33, DEC-T-06). Diferente da subida local, uma
 * falha lança: o job `publicar` fica vermelho e a versão anterior segue no ar. Idempotente: rodar de novo não duplica.
 */
export async function semearDemo(
  banco: Executor,
  agora: Date
): Promise<{
  dataset: "criado" | "existente"
  obras: "criadas" | "existentes"
}> {
  const dataset = await garantirDatasetPreCarregado(banco, agora)
  const obras = await garantirObrasPreCarregadas(banco)
  log.info("demo.semeado", { dataset, obras })
  return { dataset, obras }
}
