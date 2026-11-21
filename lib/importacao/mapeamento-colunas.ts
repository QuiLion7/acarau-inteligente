import type {
  CampoMapeado,
  MapeamentoColunas,
  MapeamentoParcial,
} from "@/lib/importacao/tipos-importacao"
import { normalizarParaBusca } from "@/lib/territorio/nome-bairro"

const CAMPOS: readonly CampoMapeado[] = ["bairro", "periodo", "casos"]

// Cabeçalho normalizado → campo (RF-02.05). Dentro do período, a ordem é a de preferência quando há mais de um.
const NOMES_POR_CAMPO: Record<CampoMapeado, readonly string[]> = {
  bairro: ["bairro"],
  periodo: ["periodo", "ano", "mes"],
  casos: ["casos"],
}

const MAPEAMENTO_VAZIO: MapeamentoParcial = {
  bairro: null,
  periodo: null,
  casos: null,
}

function indiceDoCampo(
  normalizados: readonly string[],
  campo: CampoMapeado
): number | null {
  for (const nome of NOMES_POR_CAMPO[campo]) {
    const indice = normalizados.indexOf(nome)
    if (indice >= 0) return indice
  }
  return null
}

/** Sugere pelo nome do cabeçalho (sem acento nem caixa); o que não achar fica `null`. */
export function sugerirMapeamento(
  cabecalho: readonly string[]
): MapeamentoParcial {
  const normalizados = cabecalho.map(normalizarParaBusca)
  return {
    bairro: indiceDoCampo(normalizados, "bairro"),
    periodo: indiceDoCampo(normalizados, "periodo"),
    casos: indiceDoCampo(normalizados, "casos"),
  }
}

function indiceValido(indice: number | null, colunas: number): number | null {
  const existe = indice !== null && Number.isInteger(indice)
  return existe && indice >= 0 && indice < colunas ? indice : null
}

/** O mapeamento do analista (ou a sugestão, quando ele ainda não escolheu), sem índice fora do cabeçalho. */
export function escolherMapeamento(
  cabecalho: readonly string[],
  informado: MapeamentoParcial | null
): MapeamentoParcial {
  const base = informado ?? sugerirMapeamento(cabecalho)
  return {
    ...MAPEAMENTO_VAZIO,
    bairro: indiceValido(base.bairro, cabecalho.length),
    periodo: indiceValido(base.periodo, cabecalho.length),
    casos: indiceValido(base.casos, cabecalho.length),
  }
}

/** Os três campos com coluna, cada uma numa coluna diferente (RF-02.05). */
export function mapeamentoCompleto(
  mapeamento: MapeamentoParcial
): mapeamento is MapeamentoColunas {
  const indices = CAMPOS.map((campo) => mapeamento[campo])
  const todosEscolhidos = indices.every((indice) => indice !== null)
  return todosEscolhidos && new Set(indices).size === CAMPOS.length
}

/** Nomes das colunas que nenhum campo usa: listadas ao analista e nunca lidas (RF-02.05). */
export function listarColunasIgnoradas(
  cabecalho: readonly string[],
  mapeamento: MapeamentoParcial
): string[] {
  const usadas = new Set(CAMPOS.map((campo) => mapeamento[campo]))
  return cabecalho.filter((_, indice) => !usadas.has(indice))
}
