// CSV gerado no navegador (TechSpec EP-05 §2, §3, DEC-T-12): o padrão que o Excel em português abre sem importador, com
// BOM UTF-8, `;` como separador, CRLF, vírgula decimal e data `dd/mm/aaaa`. Toda célula de texto é protegida contra
// fórmula (RF-05.20, seguranca.md §13). Puro: serve a qualquer tabela, que só declara as colunas.

export type ColunaCsv<T> = {
  cabecalho: string
  /** Nunca `null`: ausência é texto ("sem dados", "fora da cobertura"), não célula vazia que pareça zero (RN-05.03). */
  valor: (linha: T) => string | number
}

const BOM = "﻿"
const SEPARADOR = ";"
const FIM_DE_LINHA = "\r\n"
// `'` na frente faz o Excel tratar a célula como texto; os caracteres são os de seguranca.md §13.
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/

const formatadorDeNumero = new Intl.NumberFormat("pt-BR", {
  useGrouping: false,
  maximumFractionDigits: 6,
})

/** 922822.4 → "922822,4": vírgula decimal e sem separador de milhar (o `;` já separa as colunas). */
export function formatarNumeroCsv(valor: number): string {
  if (!Number.isFinite(valor)) {
    throw new RangeError("O CSV só aceita número finito.")
  }
  return formatadorDeNumero.format(valor)
}

const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/

const formatadorDeData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
})

/** "2026-12-01" → "01/12/2026" sem passar por `Date` (nada de fuso); instante ISO → o dia em Brasília. */
export function formatarDataCsv(valor: string): string {
  const dia = DATA_ISO.exec(valor)
  if (dia) return `${dia[3]}/${dia[2]}/${dia[1]}`
  const instante = new Date(valor)
  if (Number.isNaN(instante.getTime())) {
    throw new RangeError("Data inválida para o CSV.")
  }
  return formatadorDeData.format(instante)
}

function escaparCelula(valor: string): string {
  const seguro = INICIO_DE_FORMULA.test(valor) ? `'${valor}` : valor
  return /[;"\r\n]/.test(seguro) ? `"${seguro.replaceAll('"', '""')}"` : seguro
}

function textoDaCelula(valor: string | number): string {
  // Número vira texto pelo formatador, sem neutralizar o sinal de menos: é número, não texto digitado.
  return typeof valor === "number"
    ? formatarNumeroCsv(valor)
    : escaparCelula(valor)
}

/** Primeira linha: os cabeçalhos. Sem linha de rodapé. Cada célula de texto é protegida contra fórmula. */
export function gerarCsv<T>(
  colunas: readonly ColunaCsv<T>[],
  linhas: readonly T[]
): string {
  const cabecalho = colunas.map(({ cabecalho: titulo }) =>
    escaparCelula(titulo)
  )
  const corpo = linhas.map((linha) =>
    colunas.map(({ valor }) => textoDaCelula(valor(linha)))
  )
  return (
    BOM +
    [cabecalho, ...corpo]
      .map((celulas) => celulas.join(SEPARADOR))
      .join(FIM_DE_LINHA) +
    FIM_DE_LINHA
  )
}

export const TIPO_MIME_CSV = "text/csv;charset=utf-8"

/** O `Blob` do CSV: os bytes começam com o BOM (EF BB BF) e o texto é UTF-8. */
export function blobDoCsv(csv: string): Blob {
  return new Blob([csv], { type: TIPO_MIME_CSV })
}
