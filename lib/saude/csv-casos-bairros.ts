import type { ColunaCsv } from "@/lib/exportacao/csv"
import type { ItemBairroPeriodo } from "@/lib/saude/analise-periodo"

// Colunas do CSV da tabela "Casos por bairro" (RF-05.18, RF-05.21): bairro sem dados sai escrito, nunca como célula
// vazia nem zero (RN-014); zero informado continua 0. Leva o período e a proveniência (dado sintético, RN-05.02).
export const TEXTO_SEM_DADOS_CSV = "sem dados"

export function colunasCsvCasosBairros(
  periodo: string,
  proveniencia: string
): ColunaCsv<ItemBairroPeriodo>[] {
  return [
    { cabecalho: "UV", valor: ({ bairro }) => bairro.uv },
    { cabecalho: "Bairro", valor: ({ bairro }) => bairro.nome },
    { cabecalho: "Período", valor: () => periodo },
    {
      cabecalho: "Casos",
      valor: ({ casos }) => (casos === null ? TEXTO_SEM_DADOS_CSV : casos),
    },
    { cabecalho: "Proveniência", valor: () => proveniencia },
  ]
}
