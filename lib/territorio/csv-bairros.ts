import type { ColunaCsv } from "@/lib/exportacao/csv"
import type { Bairro } from "@/lib/territorio/artefato-schema"

// Colunas do CSV da tabela de bairros do Território (RF-05.18): as mesmas da tela. O total de escolas é o número da base
// (0 é zero real da base, RN-03.07); a área vai em m², número com vírgula decimal.
export type LinhaCsvBairro = Pick<
  Bairro,
  "uv" | "nome" | "areaCalculadaM2" | "totalEscolas"
>

export const COLUNAS_CSV_BAIRROS: readonly ColunaCsv<LinhaCsvBairro>[] = [
  { cabecalho: "UV", valor: ({ uv }) => uv },
  { cabecalho: "Bairro", valor: ({ nome }) => nome },
  {
    cabecalho: "Área calculada (m²)",
    valor: ({ areaCalculadaM2 }) => Math.round(areaCalculadaM2 * 10) / 10,
  },
  { cabecalho: "Escolas", valor: ({ totalEscolas }) => totalEscolas },
]
