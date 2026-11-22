// Variação do total entre períodos (TechSpec EP-03 §3, DV-36, RN-03.03): compara o período em exibição com o
// imediatamente anterior da série, só nos bairros com dado (inclusive zero) nos dois, para o total não "subir" porque
// um bairro entrou no arquivo.
import {
  type ItemBairroPeriodo,
  montarAnalisePeriodo,
} from "@/lib/saude/analise-periodo"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"
import type { SerieSaude } from "@/lib/validations/datasets-schema"

export type VariacaoPeriodo =
  | { tipo: "sem-periodo-anterior" }
  | { tipo: "sem-bairros-comparaveis"; periodoAnterior: string }
  | {
      tipo: "comparada"
      periodoAnterior: string
      bairrosComparados: number
      atual: number
      anterior: number
      absoluta: number
      /** `null` quando a base (`anterior`) é zero: percentual sobre zero não existe. */
      percentual: number | null
    }

type ParComparavel = { atual: number; anterior: number }

// As duas análises recebem os mesmos bairros na mesma ordem, então o índice emparelha cada bairro com ele mesmo.
function pareiarComparaveis(
  atuais: readonly ItemBairroPeriodo[],
  anteriores: readonly ItemBairroPeriodo[]
): ParComparavel[] {
  return atuais.flatMap(({ casos: atual }, indice) => {
    const anterior = anteriores[indice]?.casos
    return atual === null || anterior === null || anterior === undefined
      ? []
      : [{ atual, anterior }]
  })
}

function somar(valores: readonly number[]): number {
  return valores.reduce((soma, valor) => soma + valor, 0)
}

/** `bairros` = os 24 (variação do conjunto) ou só o selecionado (variação do bairro). */
export function calcularVariacao(
  serie: SerieSaude,
  periodo: string,
  bairros: readonly BairroResumo[]
): VariacaoPeriodo {
  // `periodos` vem em ordem crescente (DV-27): o anterior é o vizinho da esquerda.
  const periodoAnterior = serie.periodos[serie.periodos.indexOf(periodo) - 1]
  if (periodoAnterior === undefined) return { tipo: "sem-periodo-anterior" }

  const pares = pareiarComparaveis(
    montarAnalisePeriodo(serie, periodo, bairros).bairros,
    montarAnalisePeriodo(serie, periodoAnterior, bairros).bairros
  )
  if (pares.length === 0) {
    return { tipo: "sem-bairros-comparaveis", periodoAnterior }
  }

  const atual = somar(pares.map((par) => par.atual))
  const anterior = somar(pares.map((par) => par.anterior))
  const absoluta = atual - anterior
  return {
    tipo: "comparada",
    periodoAnterior,
    bairrosComparados: pares.length,
    atual,
    anterior,
    absoluta,
    percentual: anterior > 0 ? (absoluta / anterior) * 100 : null,
  }
}
