// Filtros da tabela de escolas e contagem de marcadores (TechSpec EP-01 §2, RF-01.20). Funções puras: a tabela
// só mostra o que elas devolvem, e o total exibido é o tamanho da lista filtrada.
import type { Escola, EstadoEscola } from "./artefato-schema"
import { normalizarParaBusca } from "./nome-bairro"

export const TODAS = "todas"

export type FiltrosEscolas = {
  /** `null` = "Todos" os bairros. Só escola `dentro-de-bairro` tem bairro. */
  bairroId: string | null
  dependencia: Escola["dependencia"] | typeof TODAS
  localizacao: Escola["localizacao"] | typeof TODAS
  cobertura: EstadoEscola | typeof TODAS
  /** `""` = sem busca. Casa trecho do nome (sem acento nem caixa) ou, se só tiver dígitos, trecho do código INEP. */
  termo: string
}

export const SEM_FILTROS: Omit<FiltrosEscolas, "bairroId"> = {
  dependencia: TODAS,
  localizacao: TODAS,
  cobertura: TODAS,
  termo: "",
}

const combina = <Valor extends string>(
  filtro: Valor | typeof TODAS,
  valor: Valor
) => filtro === TODAS || filtro === valor

const SO_DIGITOS = /^\d+$/

function casaComTermo({ nome, codigoInep }: Escola, termo: string): boolean {
  const procurado = normalizarParaBusca(termo)
  if (procurado === "") return true
  if (normalizarParaBusca(nome).includes(procurado)) return true
  return SO_DIGITOS.test(procurado) && codigoInep.includes(procurado)
}

/** Algum filtro ou busca está ligado? Decide se "Limpar filtros" tem o que limpar (o bairro vem da URL e não conta). */
export function haFiltroAtivo(
  filtros: Omit<FiltrosEscolas, "bairroId">
): boolean {
  return (
    filtros.termo.trim() !== "" ||
    filtros.dependencia !== TODAS ||
    filtros.localizacao !== TODAS ||
    filtros.cobertura !== TODAS
  )
}

/** Combina o bairro, a busca e os três filtros com "e"; a ordem original é preservada. */
export function filtrarEscolas(
  escolas: readonly Escola[],
  filtros: FiltrosEscolas
): Escola[] {
  return escolas.filter(
    (escola) =>
      (filtros.bairroId === null || escola.bairroId === filtros.bairroId) &&
      combina(filtros.dependencia, escola.dependencia) &&
      combina(filtros.localizacao, escola.localizacao) &&
      combina(filtros.cobertura, escola.estado) &&
      casaComTermo(escola, filtros.termo)
  )
}

export type MarcadoresPorEstado = Record<
  Exclude<EstadoEscola, "sem-localizacao">,
  number
>

/** Quantos marcadores cada estado tem no mapa; escola sem localização não tem marcador (RN-01.03). */
export function contarMarcadores(
  escolas: readonly Escola[]
): MarcadoresPorEstado {
  const contagem: MarcadoresPorEstado = {
    "dentro-de-bairro": 0,
    "fora-da-cobertura": 0,
    "fora-do-limite": 0,
  }
  for (const { estado, posicao } of escolas) {
    if (estado !== "sem-localizacao" && posicao !== null) contagem[estado] += 1
  }
  return contagem
}

export function totalDeMarcadores(contagem: MarcadoresPorEstado): number {
  return (
    contagem["dentro-de-bairro"] +
    contagem["fora-da-cobertura"] +
    contagem["fora-do-limite"]
  )
}
