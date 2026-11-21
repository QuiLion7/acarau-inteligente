import {
  lerCasos,
  lerPeriodo,
  type PeriodoLido,
} from "@/lib/importacao/valores"
import type {
  CodigoProblema,
  Granularidade,
  LinhaLida,
  MapeamentoColunas,
  SeveridadeProblema,
} from "@/lib/importacao/tipos-importacao"
import { normalizarParaBusca } from "@/lib/territorio/nome-bairro"

// Validação de cada linha isolada (RF-02.13, RF-02.14). O que depende de outras linhas (duplicata) ou do território
// (bairro) é de `duplicatas.ts` e de `correspondencia-bairros.ts`.

export const SEVERIDADE_POR_CODIGO: Record<CodigoProblema, SeveridadeProblema> =
  {
    PERIODO_INVALIDO: "erro",
    GRANULARIDADE_MISTURADA: "erro",
    CASOS_NEGATIVO: "erro",
    CASOS_DECIMAL: "erro",
    CASOS_NAO_NUMERICO: "erro",
    CASOS_VAZIO: "aviso",
    BAIRRO_VAZIO: "erro",
    DUPLICATA: "erro",
  }

export type LinhaAnalisada = {
  numero: number
  nomeOriginal: string
  /** Vazio quando a célula do bairro está vazia (`BAIRRO_VAZIO`). */
  nomeNormalizado: string
  /** `null` quando o período é inválido ou destoa da granularidade do arquivo. */
  periodo: PeriodoLido | null
  /** `null` quando a célula está vazia (sem dado) ou é inválida. */
  casos: number | null
  codigos: CodigoProblema[]
}

type CasosDaLinha = { casos: number | null; codigos: CodigoProblema[] }

function analisarCasos(texto: string): CasosDaLinha {
  const lido = lerCasos(texto)
  if (lido.tipo === "valor") return { casos: lido.casos, codigos: [] }
  if (lido.tipo === "vazio") return { casos: null, codigos: ["CASOS_VAZIO"] }
  return { casos: null, codigos: [lido.codigo] }
}

export function analisarLinha(
  linha: LinhaLida,
  mapeamento: MapeamentoColunas
): LinhaAnalisada {
  const nomeOriginal = linha.celulas[mapeamento.bairro] ?? ""
  const nomeNormalizado = normalizarParaBusca(nomeOriginal)
  const periodo = lerPeriodo(linha.celulas[mapeamento.periodo] ?? "")
  const { casos, codigos } = analisarCasos(
    linha.celulas[mapeamento.casos] ?? ""
  )

  const problemas: CodigoProblema[] = []
  if (nomeNormalizado === "") problemas.push("BAIRRO_VAZIO")
  if (periodo === null) problemas.push("PERIODO_INVALIDO")
  return {
    numero: linha.numero,
    nomeOriginal,
    nomeNormalizado,
    periodo,
    casos,
    codigos: [...problemas, ...codigos],
  }
}

/**
 * Todos os períodos do arquivo têm a granularidade da primeira linha com período válido; as que destoam viram
 * `GRANULARIDADE_MISTURADA` e ficam sem período (RF-02.13).
 */
export function aplicarGranularidade(linhas: readonly LinhaAnalisada[]): {
  linhas: LinhaAnalisada[]
  granularidade: Granularidade | null
} {
  const granularidade =
    linhas.find(({ periodo }) => periodo !== null)?.periodo?.granularidade ??
    null
  const ajustadas = linhas.map((linha) => {
    const destoa =
      linha.periodo !== null && linha.periodo.granularidade !== granularidade
    return destoa
      ? {
          ...linha,
          periodo: null,
          codigos: [...linha.codigos, "GRANULARIDADE_MISTURADA" as const],
        }
      : linha
  })
  return { linhas: ajustadas, granularidade }
}
