// Filtro, resumo e ordenação das obras (TechSpec EP-04 §3, RF-04.05, RF-04.07, RF-04.09). Funções puras: lista, mapa
// e resumo recebem o mesmo array filtrado, e o total exibido é o tamanho dele.
import { SITUACOES_OBRA, type SituacaoObra } from "./situacao-obra"
import type { Obra } from "@/lib/validations/obra-schema"

export type FiltroObras = {
  /** Vazio = todas as situações (nenhum chip marcado). */
  situacoes: readonly SituacaoObra[]
  /** `null` = "Todos os bairros". Só obra `dentro-de-bairro` tem bairro. */
  bairroId: string | null
}

export type ResumoObras = {
  total: number
  /** Contagem de cadastro: situação sem obra é 0, nunca "sem dado" (RN-04.12). */
  porSituacao: Record<SituacaoObra, number>
  semLocalizacao: number
}

const SEPARADOR_SITUACOES = ","

/** "planejada,suspensa" → situações válidas, sem duplicata e na ordem do catálogo; o resto é ignorado. */
export function lerSituacoes(param: string | null): SituacaoObra[] {
  if (!param) return []
  const pedidas = new Set(param.split(SEPARADOR_SITUACOES))
  return SITUACOES_OBRA.filter((situacao) => pedidas.has(situacao))
}

/** Situações marcadas → valor do parâmetro `situacao` da URL; nenhuma marcada → `null` (sai da URL). */
export function escreverSituacoes(
  situacoes: readonly SituacaoObra[]
): string | null {
  const marcadas = SITUACOES_OBRA.filter((situacao) =>
    situacoes.includes(situacao)
  )
  return marcadas.length === 0 ? null : marcadas.join(SEPARADOR_SITUACOES)
}

/** Combina situações e bairro com "e". Devolve da última atualização mais recente para a mais antiga (RF-04.04). */
export function filtrarObras(
  obras: readonly Obra[],
  { situacoes, bairroId }: FiltroObras
): Obra[] {
  return obras
    .filter(
      (obra) =>
        (situacoes.length === 0 || situacoes.includes(obra.situacao)) &&
        (bairroId === null || obra.bairroId === bairroId)
    )
    .toSorted((a, b) => Date.parse(b.atualizadoEm) - Date.parse(a.atualizadoEm))
}

export function resumirObras(obras: readonly Obra[]): ResumoObras {
  const porSituacao: Record<SituacaoObra, number> = {
    planejada: 0,
    em_andamento: 0,
    concluida: 0,
    suspensa: 0,
  }
  let semLocalizacao = 0
  for (const obra of obras) {
    porSituacao[obra.situacao] += 1
    if (obra.estadoLocalizacao === "sem-localizacao") semLocalizacao += 1
  }
  return { total: obras.length, porSituacao, semLocalizacao }
}
