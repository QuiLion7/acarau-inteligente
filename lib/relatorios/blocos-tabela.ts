// Tabela do PDF em blocos (TechSpec EP-05 §2, RF-05.16): cada bloco repete o cabeçalho e é desenhado inteiro (linhas
// `wrap={false}`), então a quebra de página nunca corta a tabela sem cabeçalho nem uma linha ao meio.

export const LINHAS_POR_BLOCO = 25

/** Fatias de até `tamanho` linhas, na ordem; sem linhas não há bloco. */
export function dividirEmBlocos<T>(
  linhas: readonly T[],
  tamanho: number = LINHAS_POR_BLOCO
): T[][] {
  if (!Number.isInteger(tamanho) || tamanho < 1) {
    throw new RangeError("O tamanho do bloco deve ser um inteiro positivo.")
  }
  const blocos: T[][] = []
  for (let inicio = 0; inicio < linhas.length; inicio += tamanho) {
    blocos.push(linhas.slice(inicio, inicio + tamanho))
  }
  return blocos
}
