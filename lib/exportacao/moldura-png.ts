import type { ItemLegendaPng } from "@/lib/exportacao/legendas-png"

// O que acompanha a imagem do mapa no PNG (TechSpec EP-05 §4.3, RF-05.22, RN-05.02): título da tela, filtros, legenda e os
// selos. "Demonstração Independente" vai sempre; "Dados sintéticos" em Saúde e Obras, mesmo agregado. A atribuição do
// OpenStreetMap vem de `lib/config/mapa-base.ts` e entra mesmo sem o fundo.
export type MolduraPng = {
  titulo: string
  filtros: string[]
  legenda: ItemLegendaPng[]
  selos: string[]
}

export const SELO_DEMONSTRACAO = "Demonstração Independente"
export const SELO_SINTETICO = "Dados sintéticos"

type EntradaMoldura = {
  titulo: string
  /** Bairro filtrado; `null` = todos os bairros. */
  bairro: string | null
  /** Outros filtros da tela, já em texto ("Período: 2026"). */
  outrosFiltros?: string[]
  legenda: ItemLegendaPng[]
  /** Saúde e Obras: liga o selo "Dados sintéticos". */
  sintetico: boolean
}

export function montarMolduraPng({
  titulo,
  bairro,
  outrosFiltros = [],
  legenda,
  sintetico,
}: EntradaMoldura): MolduraPng {
  return {
    titulo,
    filtros: [`Bairro: ${bairro ?? "todos os bairros"}`, ...outrosFiltros],
    legenda,
    selos: sintetico
      ? [SELO_DEMONSTRACAO, SELO_SINTETICO]
      : [SELO_DEMONSTRACAO],
  }
}
