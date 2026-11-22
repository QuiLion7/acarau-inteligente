// Leitura e formatação dos valores digitados da obra (TechSpec EP-04 §2, RF-04.17, RF-04.20). Puro e sem eco do
// texto recusado: quem chama decide a mensagem.

/** R$ 10 bilhões em centavos (TechSpec §4, `valorPrevistoCentavos`). */
export const VALOR_MAXIMO_CENTAVOS = 1_000_000_000_000
const CASAS_DA_COORDENADA = 1_000_000
const CENTAVOS_POR_REAL = 100

const COORDENADA = /^-?\d+(?:[.,]\d+)?$/
// Formato pt-BR: milhar com ponto (opcional) e até duas casas depois da vírgula. "1,2,3" e "12.34" não passam.
const VALOR_PT_BR = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/

/** "-2,885116" e "-2.885116" → -2.885116; texto que não é número → `null`. Não confere os limites geográficos. */
export function lerCoordenada(texto: string): number | null {
  const limpo = texto.trim()
  if (!COORDENADA.test(limpo)) return null
  return Number(limpo.replace(",", "."))
}

/** Grava a coordenada com 6 casas, a mesma precisão do artefato (DEC-T-07). */
export function arredondarCoordenada(valor: number): number {
  return Math.round(valor * CASAS_DA_COORDENADA) / CASAS_DA_COORDENADA
}

/** "250.000,00" → 25000000 centavos; sem sinal e sem casas além dos centavos. Não confere o teto. */
export function lerValorEmReais(texto: string): number | null {
  const encontrado = VALOR_PT_BR.exec(texto.trim())
  if (!encontrado) return null
  const [, reais, centavos = ""] = encontrado
  const total =
    Number(reais.replaceAll(".", "")) * CENTAVOS_POR_REAL +
    Number(centavos.padEnd(2, "0"))
  return Number.isSafeInteger(total) ? total : null
}

const formatadorDeCoordenada = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 6,
})

/** -2.885116 → "-2,885116": a coordenada como se escreve em pt-BR, com até 6 casas. */
export function formatarCoordenada(valor: number): string {
  return formatadorDeCoordenada.format(valor)
}

const formatadorDeReais = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

/** 25000000 → "R$ 250.000,00". */
export function formatarValorEmReais(centavos: number): string {
  return formatadorDeReais.format(centavos / CENTAVOS_POR_REAL)
}

const formatadorDeCampo = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 25000000 → "250.000,00": o valor como volta ao campo do formulário na edição. */
export function formatarValorParaCampo(centavos: number): string {
  return formatadorDeCampo.format(centavos / CENTAVOS_POR_REAL)
}

/** "2026-12-01" → "01/12/2026", sem passar por `Date` (nada de fuso). */
export function formatarData(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-")
  return `${dia}/${mes}/${ano}`
}

const formatadorDeInstante = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
})

/** Instante ISO 8601 UTC → "21/11/2026 11:05", sempre no horário de Brasília. */
export function formatarInstante(instanteIso: string): string {
  return formatadorDeInstante.format(new Date(instanteIso)).replace(", ", " ")
}
