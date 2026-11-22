import type { ColunaCsv } from "@/lib/exportacao/csv"
import type { Bairro, QualidadeEscolas } from "@/lib/territorio/artefato-schema"
import { foraDaCoberturaDosBairros } from "@/lib/territorio/contagem-cobertura"
import { ROTULO_ESTADO_ESCOLA } from "@/lib/territorio/estado-escola"

// Colunas do CSV da tabela "Escolas por bairro" da Educação (RF-05.18): os bairros e, depois, as linhas fora da soma
// (fora da cobertura, fora do limite, sem localização), que a tela também mostra à parte (DV-39). Na coluna UV, as linhas
// fora da soma dizem "fora da soma": a célula nunca fica vazia.
export type LinhaCsvEscolasPorBairro = {
  uv: number | "fora da soma"
  nome: string
  escolas: number
}

export const UV_FORA_DA_SOMA = "fora da soma"

export const COLUNAS_CSV_ESCOLAS_POR_BAIRRO: readonly ColunaCsv<LinhaCsvEscolasPorBairro>[] =
  [
    { cabecalho: "UV", valor: ({ uv }) => uv },
    { cabecalho: "Bairro", valor: ({ nome }) => nome },
    { cabecalho: "Escolas", valor: ({ escolas }) => escolas },
  ]

/** Os bairros na ordem recebida (a da tabela, já ordenada) e as três linhas fora da soma no fim. */
export function linhasCsvEscolasPorBairro(
  bairros: readonly Pick<Bairro, "uv" | "nome" | "totalEscolas">[],
  qualidade: QualidadeEscolas
): LinhaCsvEscolasPorBairro[] {
  return [
    ...bairros.map(({ uv, nome, totalEscolas }) => ({
      uv,
      nome,
      escolas: totalEscolas,
    })),
    {
      uv: UV_FORA_DA_SOMA,
      nome: ROTULO_ESTADO_ESCOLA["fora-da-cobertura"],
      escolas: foraDaCoberturaDosBairros(qualidade),
    },
    {
      uv: UV_FORA_DA_SOMA,
      nome: ROTULO_ESTADO_ESCOLA["fora-do-limite"],
      escolas: qualidade.foraDoLimite,
    },
    {
      uv: UV_FORA_DA_SOMA,
      nome: ROTULO_ESTADO_ESCOLA["sem-localizacao"],
      escolas: qualidade.semLocalizacao,
    },
  ]
}
