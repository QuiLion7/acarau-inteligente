import type { QualidadeEscolas } from "@/lib/territorio/artefato-schema"

// O artefato guarda em `foraDaCobertura` também a escola fora do limite municipal (DV-37). A contagem exibida em
// qualquer tela é esta, sem ela, para que 24 + fora da cobertura + fora do limite + sem localização feche em 62
// (DV-39). Única conta feita sobre o artefato: nenhuma tela subtrai por conta própria.
export function foraDaCoberturaDosBairros(
  qualidade: Pick<QualidadeEscolas, "foraDaCobertura" | "foraDoLimite">
): number {
  return qualidade.foraDaCobertura - qualidade.foraDoLimite
}
