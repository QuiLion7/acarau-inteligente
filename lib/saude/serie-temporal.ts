// Série por período para o gráfico (RF-02.38, DV-26): a do bairro, ou a soma dos bairros com dados em cada período.
// Período sem dado é lacuna (`null`), nunca zero, e nada é interpolado.
import type { SerieSaude } from "@/lib/validations/datasets-schema"

export type PontoSerie = {
  periodo: string
  /** `null` = lacuna. */
  casos: number | null
  /** Quantos bairros entraram na soma deste período (0 ou 1 na série de um bairro). */
  bairrosComDados: number
}

function casosDoPeriodo(
  valores: SerieSaude["valores"],
  periodo: string,
  bairroId: string | null
): number[] {
  const dosBairros =
    bairroId === null ? Object.values(valores) : [valores[bairroId] ?? {}]
  return dosBairros.flatMap((porPeriodo) => porPeriodo[periodo] ?? [])
}

export function montarSerieTemporal(
  serie: SerieSaude,
  bairroId: string | null
): PontoSerie[] {
  return serie.periodos.map((periodo) => {
    const casos = casosDoPeriodo(serie.valores, periodo, bairroId)
    return {
      periodo,
      casos:
        casos.length === 0
          ? null
          : casos.reduce((soma, valor) => soma + valor, 0),
      bairrosComDados: casos.length,
    }
  })
}
