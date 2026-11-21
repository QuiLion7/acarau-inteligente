// Ranking dos bairros com dados (RF-02.33, RN-02.11, DV-26): mais casos primeiro; empate pelo nome normalizado. O zero
// explícito é dado e entra, no fim; quem está sem dados fica de fora e é citado à parte.
import type { ItemBairroPeriodo } from "@/lib/saude/analise-periodo"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"
import { normalizarParaBusca } from "@/lib/territorio/nome-bairro"

export type ItemDoRanking = ItemBairroPeriodo & { casos: number }

function comDados(item: ItemBairroPeriodo): item is ItemDoRanking {
  return item.casos !== null
}

function pelaOrdemDoNome(a: BairroResumo, b: BairroResumo): number {
  return normalizarParaBusca(a.nome).localeCompare(
    normalizarParaBusca(b.nome),
    "pt-BR"
  )
}

export function ordenarRanking(itens: readonly ItemBairroPeriodo[]): {
  ranking: ItemDoRanking[]
  semDados: BairroResumo[]
} {
  const ranking = itens
    .filter(comDados)
    .toSorted(
      (a, b) => b.casos - a.casos || pelaOrdemDoNome(a.bairro, b.bairro)
    )
  const semDados = itens
    .filter((item) => !comDados(item))
    .map(({ bairro }) => bairro)
    .toSorted(pelaOrdemDoNome)
  return { ranking, semDados }
}
