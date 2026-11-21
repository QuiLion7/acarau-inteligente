// Análise do período em exibição (TechSpec EP-02 §3.3, §4.4, DV-26): um único objeto que o mapa, a legenda, o total,
// o ranking e a tabela leem, para os valores serem os mesmos em todas as apresentações (CA-02.19).
import {
  calcularClasses,
  classeDoValor,
  type ClassesCoropletico,
} from "@/lib/saude/classes-coropletico"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"
import type {
  ForaDaCobertura,
  SerieSaude,
} from "@/lib/validations/datasets-schema"

/** `valor` = casos positivos; `zero` = zero explícito do arquivo; `sem-dados` = sem linha ou casos vazio (RN-014). */
export type SituacaoBairro = "valor" | "zero" | "sem-dados"

export type ItemBairroPeriodo = {
  bairro: BairroResumo
  situacao: SituacaoBairro
  /** `null` só em `sem-dados`: ausência nunca vira zero. */
  casos: number | null
  /** Índice da classe do coroplético; só em `valor`. */
  classe: number | null
}

export type AnalisePeriodo = {
  /** Os bairros recebidos, na ordem recebida. */
  bairros: ItemBairroPeriodo[]
  classes: ClassesCoropletico
  /** Soma de `valor` e `zero` (RN-02.12): `bairrosComDados` conta os dois. */
  total: { casos: number; bairrosComDados: number }
  foraDaCobertura: ForaDaCobertura
}

const SEM_FORA_DA_COBERTURA: ForaDaCobertura = { casos: 0, localidades: 0 }

type ValoresDoBairro = SerieSaude["valores"][string] | undefined

function situacaoDe(casos: number | null | undefined): SituacaoBairro {
  if (casos === undefined || casos === null) return "sem-dados"
  return casos === 0 ? "zero" : "valor"
}

function casosDoBairro(
  valores: ValoresDoBairro,
  periodo: string
): number | null {
  return valores?.[periodo] ?? null
}

export function montarAnalisePeriodo(
  serie: SerieSaude,
  periodo: string,
  bairros: readonly BairroResumo[]
): AnalisePeriodo {
  const lidos = bairros.map((bairro) => {
    const casos = casosDoBairro(serie.valores[bairro.id], periodo)
    return { bairro, casos, situacao: situacaoDe(casos) }
  })
  const classes = calcularClasses(
    lidos.flatMap(({ casos }) => (casos !== null && casos > 0 ? [casos] : []))
  )
  const itens = lidos.map((item) => ({
    ...item,
    classe:
      item.situacao === "valor" && item.casos !== null
        ? classeDoValor(classes, item.casos)
        : null,
  }))
  const comDados = itens.filter(({ situacao }) => situacao !== "sem-dados")
  return {
    bairros: itens,
    classes,
    total: {
      casos: comDados.reduce((soma, { casos }) => soma + (casos ?? 0), 0),
      bairrosComDados: comDados.length,
    },
    foraDaCobertura: serie.foraDaCobertura[periodo] ?? SEM_FORA_DA_COBERTURA,
  }
}
