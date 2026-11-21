// Classes do coroplético por quantis (TechSpec EP-02 §4.5, RN-02.10, DV-26): puro, o mesmo cálculo para o mapa, a
// legenda e (no EP-05) o PDF. Só os valores positivos entram; zero e "sem dados" têm entradas próprias na legenda.

export const MAXIMO_DE_CLASSES = 5

export type ClasseCoropletico = {
  /** 1 a 5, do menor para o maior valor. */
  indice: number
  minimo: number
  maximo: number
  rotulo: string
}

export type ClassesCoropletico = {
  classes: ClasseCoropletico[]
  /** Todos os valores positivos iguais (ou um só bairro): a legenda explica a classe única (RF-02.32). */
  classeUnica: boolean
}

const formatadorDeNumero = new Intl.NumberFormat("pt-BR")

function rotuloDaClasse(minimo: number, maximo: number): string {
  const valor = (numero: number) => formatadorDeNumero.format(numero)
  if (minimo === maximo)
    return `${valor(minimo)} ${minimo === 1 ? "caso" : "casos"}`
  return `${valor(minimo)} a ${valor(maximo)} casos`
}

// O limite superior da classe `i` (1..k) é `v[ceil(i·n/k) - 1]`; limites repetidos somem. Valores iguais têm o mesmo
// limite e por isso caem sempre na mesma classe: é o desempate explícito (RF-02.31).
function limitesSuperiores(ordenados: readonly number[]): number[] {
  const quantidade = ordenados.length
  const distintos = new Set(ordenados).size
  const totalDeClasses = Math.min(MAXIMO_DE_CLASSES, distintos)
  const limites = Array.from({ length: totalDeClasses }, (_, posicao) => {
    const indiceNoOrdenado =
      Math.ceil(((posicao + 1) * quantidade) / totalDeClasses) - 1
    return ordenados[indiceNoOrdenado] ?? 0
  })
  return [...new Set(limites)]
}

export function calcularClasses(
  valoresPositivos: readonly number[]
): ClassesCoropletico {
  const ordenados = valoresPositivos.toSorted((a, b) => a - b)
  const limites = limitesSuperiores(ordenados)
  const classes = limites.map((maximo, posicao) => {
    const limiteAnterior = limites[posicao - 1] ?? 0
    // O limite inferior é o menor valor presente na classe, não o limite da anterior.
    const minimo = ordenados.find((valor) => valor > limiteAnterior) ?? maximo
    return {
      indice: posicao + 1,
      minimo,
      maximo,
      rotulo: rotuloDaClasse(minimo, maximo),
    }
  })
  return { classes, classeUnica: classes.length === 1 }
}

/** A primeira classe cujo limite superior é maior ou igual ao valor; `null` se não há classe (sem positivos). */
export function classeDoValor(
  { classes }: ClassesCoropletico,
  valor: number
): number | null {
  return classes.find(({ maximo }) => maximo >= valor)?.indice ?? null
}
