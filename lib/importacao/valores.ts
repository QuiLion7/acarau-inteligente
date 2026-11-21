import type {
  CodigoProblema,
  Granularidade,
} from "@/lib/importacao/tipos-importacao"

// Regras de período e de casos (RF-02.13, RF-02.14). Regex só ancoradas e sem repetição aninhada (seguranca §13).
const ANO = /^\d{4}$/
const ANO_MES = /^\d{4}-(?:0[1-9]|1[0-2])$/
const INTEIRO = /^\d+$/
const MILHAR_PT_BR = /^\d{1,3}(?:\.\d{3})+$/
const DECIMAL = /^\d+[.,]\d+$/
const NEGATIVO = /^-\d+(?:[.,]\d+)?$/

// A coluna `casos` é `integer` no banco (TechSpec §4.6): acima disso a gravação falharia.
const CASOS_MAXIMOS = 2_147_483_647

export type PeriodoLido = { periodo: string; granularidade: Granularidade }

export type CasosLidos =
  | { tipo: "valor"; casos: number }
  | { tipo: "vazio" }
  | { tipo: "erro"; codigo: Extract<CodigoProblema, `CASOS_${string}`> }

/** `AAAA` ou `AAAA-MM` (mês 01 a 12); qualquer outra forma é inválida. */
export function lerPeriodo(texto: string): PeriodoLido | null {
  const periodo = texto.trim()
  if (ANO.test(periodo)) return { periodo, granularidade: "ano" }
  if (ANO_MES.test(periodo)) return { periodo, granularidade: "mes" }
  return null
}

function inteiroDentroDoLimite(texto: string): CasosLidos {
  const casos = Number(texto)
  return casos <= CASOS_MAXIMOS
    ? { tipo: "valor", casos }
    : { tipo: "erro", codigo: "CASOS_NAO_NUMERICO" }
}

/** Inteiro ≥ 0, com ou sem milhar pt-BR (`1.234`); vazio é "sem dado", nunca zero (RN-014). */
export function lerCasos(texto: string): CasosLidos {
  const valor = texto.trim()
  if (valor === "") return { tipo: "vazio" }
  if (INTEIRO.test(valor)) return inteiroDentroDoLimite(valor)
  if (MILHAR_PT_BR.test(valor)) {
    return inteiroDentroDoLimite(valor.replaceAll(".", ""))
  }
  if (NEGATIVO.test(valor)) return { tipo: "erro", codigo: "CASOS_NEGATIVO" }
  if (DECIMAL.test(valor)) return { tipo: "erro", codigo: "CASOS_DECIMAL" }
  return { tipo: "erro", codigo: "CASOS_NAO_NUMERICO" }
}
