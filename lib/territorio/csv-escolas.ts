import type { ColunaCsv } from "@/lib/exportacao/csv"
import type { Escola } from "@/lib/territorio/artefato-schema"
import { ROTULO_ESTADO_ESCOLA } from "@/lib/territorio/estado-escola"

// Colunas do CSV da lista de escolas (RF-05.18, RF-05.21): as da tabela, com a cobertura por extenso e "sem bairro" onde
// a escola não está dentro de nenhum (nunca célula vazia).
export type LinhaCsvEscola = Pick<
  Escola,
  "nome" | "codigoInep" | "dependencia" | "localizacao" | "estado"
> & { bairroNome: string | null }

export const SEM_BAIRRO_CSV = "sem bairro"

export const COLUNAS_CSV_ESCOLAS: readonly ColunaCsv<LinhaCsvEscola>[] = [
  { cabecalho: "Escola", valor: ({ nome }) => nome },
  { cabecalho: "Código INEP", valor: ({ codigoInep }) => codigoInep },
  { cabecalho: "Dependência", valor: ({ dependencia }) => dependencia },
  { cabecalho: "Localização", valor: ({ localizacao }) => localizacao },
  {
    cabecalho: "Bairro",
    valor: ({ bairroNome }) => bairroNome ?? SEM_BAIRRO_CSV,
  },
  {
    cabecalho: "Cobertura",
    valor: ({ estado }) => ROTULO_ESTADO_ESCOLA[estado],
  },
]
