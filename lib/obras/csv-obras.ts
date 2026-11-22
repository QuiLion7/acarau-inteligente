import { formatarDataCsv, type ColunaCsv } from "@/lib/exportacao/csv"
import { rotuloDoBairroDaObra } from "@/lib/obras/apresentacao-obra"
import {
  ROTULO_CATEGORIA_OBRA,
  ROTULO_SITUACAO_OBRA,
} from "@/lib/obras/situacao-obra"
import type { Obra } from "@/lib/validations/obra-schema"

// Colunas do CSV da lista de Obras (RF-05.18, RF-05.21): as mesmas da tabela, mais a proveniência, com o estado em texto.
// O valor previsto não é coluna visível da lista e não é exportado (não é valor pago, RN-021).
const NAO_INFORMADA = "não informada"

type BairroComNome = { id: string; nome: string }

export function colunasCsvObras(
  bairros: readonly BairroComNome[]
): ColunaCsv<Obra>[] {
  return [
    { cabecalho: "Obra", valor: (obra) => obra.titulo },
    {
      cabecalho: "Situação",
      valor: (obra) => ROTULO_SITUACAO_OBRA[obra.situacao],
    },
    {
      cabecalho: "Categoria",
      valor: (obra) =>
        obra.categoria ? ROTULO_CATEGORIA_OBRA[obra.categoria] : NAO_INFORMADA,
    },
    {
      cabecalho: "Bairro",
      valor: (obra) => rotuloDoBairroDaObra(obra, bairros),
    },
    {
      cabecalho: "Data prevista",
      valor: (obra) =>
        obra.dataPrevista ? formatarDataCsv(obra.dataPrevista) : NAO_INFORMADA,
    },
    {
      cabecalho: "Última atualização",
      valor: (obra) => formatarDataCsv(obra.atualizadoEm),
    },
    { cabecalho: "Proveniência", valor: (obra) => obra.proveniencia },
  ]
}
