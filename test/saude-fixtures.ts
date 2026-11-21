import type { AnaliseDatasetSaude } from "@/lib/saude/analise-dataset"
import type { ItemBairroPeriodo } from "@/lib/saude/analise-periodo"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"

// Quatro bairros bastam para os testes de interface da Saúde: um com valor, um com zero explícito e dois sem dados
// em 2026; em 2025 o Centro empata com Rodagem para o desempate por nome aparecer.
export const BAIRROS_SAUDE: BairroResumo[] = [
  { id: "uv-01", uv: 1, nome: "Outra Banda", nomeLei: "OUTRA BANDA" },
  { id: "uv-10", uv: 10, nome: "Centro", nomeLei: "CENTRO" },
  { id: "uv-13", uv: 13, nome: "Rodagem", nomeLei: "RODAGEM" },
  {
    id: "uv-20",
    uv: 20,
    nome: "Morada dos Ventos",
    nomeLei: "MORADA DOS VENTOS",
  },
]

export const ANALISE_SAUDE: AnaliseDatasetSaude = {
  versao: {
    id: "v-1",
    numero: 1,
    situacao: "publicado",
    importadoEm: "2026-11-20T14:02:11.000Z",
    publicadoEm: "2026-11-20T15:00:00.000Z",
  },
  dataset: {
    nome: "Roteiro 2025-2026",
    indicador: "Casos notificados (sintético)",
    fonte: "Planilha de roteiro",
    unidade: "casos",
    proveniencia: "SINTETICO",
  },
  periodos: ["2025", "2026"],
  valores: {
    "uv-01": { "2025": 12, "2026": 0 },
    "uv-10": { "2025": 9, "2026": 51 },
    "uv-13": { "2025": 9, "2026": null },
  },
  foraDaCobertura: { "2025": { casos: 6, localidades: 1 } },
  opcoes: [
    { id: "v-1", rotulo: "Roteiro 2025-2026, versão 1", situacao: "publicado" },
  ],
  podeGerenciar: false,
}

export function itemDoBairro(
  bairro: BairroResumo,
  casos: number | null
): ItemBairroPeriodo {
  return {
    bairro,
    situacao: casos === null ? "sem-dados" : casos === 0 ? "zero" : "valor",
    casos,
    classe: null,
  }
}
