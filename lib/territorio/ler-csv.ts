// Leitor de CSV (RFC 4180 simplificado: aspas, vírgula e quebra de linha dentro de campo, BOM). Puro.
const BOM = "﻿"

function dividirEmLinhas(texto: string): string[][] {
  const linhas: string[][] = []
  let campo = ""
  let linha: string[] = []
  let entreAspas = false
  for (let indice = 0; indice < texto.length; indice++) {
    const caractere = texto[indice]
    if (entreAspas) {
      if (caractere !== '"') campo += caractere
      else if (texto[indice + 1] === '"') {
        campo += '"'
        indice += 1
      } else entreAspas = false
      continue
    }
    if (caractere === '"') entreAspas = true
    else if (caractere === ",") {
      linha.push(campo)
      campo = ""
    } else if (caractere === "\n" || caractere === "\r") {
      if (caractere === "\r" && texto[indice + 1] === "\n") indice += 1
      linha.push(campo)
      linhas.push(linha)
      campo = ""
      linha = []
    } else campo += caractere
  }
  if (campo !== "" || linha.length > 0) linhas.push([...linha, campo])
  return linhas
}

/** Primeira linha é o cabeçalho; cada linha seguinte vira um objeto coluna → texto. Linhas em branco são ignoradas. */
export function lerCsv(texto: string): Record<string, string>[] {
  const semBom = texto.startsWith(BOM) ? texto.slice(BOM.length) : texto
  const [cabecalho, ...linhas] = dividirEmLinhas(semBom).filter(
    (linha) => linha.length > 1 || linha[0] !== ""
  )
  if (!cabecalho) return []
  return linhas.map((linha) =>
    Object.fromEntries(
      cabecalho.map((coluna, indice) => [coluna, linha[indice] ?? ""])
    )
  )
}
