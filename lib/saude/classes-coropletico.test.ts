import { calcularClasses, classeDoValor } from "@/lib/saude/classes-coropletico"

function intervalos(valores: number[]) {
  return calcularClasses(valores).classes.map(({ minimo, maximo }) => [
    minimo,
    maximo,
  ])
}

describe("calcularClasses (TU-14, RN-02.10)", () => {
  it("divide por quantis em até 5 classes, do menor para o maior valor", () => {
    const { classes, classeUnica } = calcularClasses([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ])

    expect(classes.map(({ indice, rotulo }) => [indice, rotulo])).toEqual([
      [1, "1 a 2 casos"],
      [2, "3 a 4 casos"],
      [3, "5 a 6 casos"],
      [4, "7 a 8 casos"],
      [5, "9 a 10 casos"],
    ])
    expect(classeUnica).toBe(false)
  })

  it("não depende da ordem em que os valores chegam nem altera a lista recebida", () => {
    const entrada = [9, 1, 5, 3, 7, 2, 10, 4, 8, 6]

    expect(intervalos(entrada)).toEqual(
      intervalos([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    )
    expect(entrada[0]).toBe(9)
  })

  it("valores iguais caem sempre na mesma classe, mesmo no limite entre duas (desempate)", () => {
    const classes = calcularClasses([1, 2, 2, 2, 3, 10])

    expect(
      classes.classes.map(({ minimo, maximo }) => [minimo, maximo])
    ).toEqual([
      [1, 2],
      [3, 3],
      [10, 10],
    ])
    expect(classeDoValor(classes, 2)).toBe(1)
    expect(classeDoValor(classes, 3)).toBe(2)
  })

  it("com menos valores distintos que classes usa só as classes necessárias", () => {
    expect(intervalos([5, 5, 5, 5, 9])).toEqual([
      [5, 5],
      [9, 9],
    ])
  })

  it("valores todos iguais viram uma classe única", () => {
    const resultado = calcularClasses([7, 7, 7])

    expect(resultado.classeUnica).toBe(true)
    expect(resultado.classes).toEqual([
      { indice: 1, minimo: 7, maximo: 7, rotulo: "7 casos" },
    ])
  })

  it("um só bairro com dados é classe única, no singular quando é 1 caso", () => {
    expect(calcularClasses([1]).classes[0]?.rotulo).toBe("1 caso")
    expect(calcularClasses([42]).classeUnica).toBe(true)
  })

  it("sem nenhum valor positivo não há classe nem classe única", () => {
    expect(calcularClasses([])).toEqual({ classes: [], classeUnica: false })
  })

  it("separa o milhar no rótulo", () => {
    expect(
      calcularClasses([1200, 3400]).classes.map(({ rotulo }) => rotulo)
    ).toEqual(["1.200 casos", "3.400 casos"])
  })

  it("com 24 valores distintos cobre todos, em classes sem sobreposição", () => {
    const valores = Array.from({ length: 24 }, (_, indice) => indice + 1)

    const { classes } = calcularClasses(valores)

    expect(classes).toHaveLength(5)
    classes.slice(1).forEach(({ minimo }, posicao) => {
      expect(minimo).toBeGreaterThan(classes[posicao]?.maximo ?? Infinity)
    })
    expect(classes[0]?.minimo).toBe(1)
    expect(classes.at(-1)?.maximo).toBe(24)
  })
})

describe("classeDoValor", () => {
  it("devolve a classe do valor e null quando não há classes", () => {
    const classes = calcularClasses([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

    expect(classeDoValor(classes, 1)).toBe(1)
    expect(classeDoValor(classes, 6)).toBe(3)
    expect(classeDoValor(classes, 10)).toBe(5)
    expect(classeDoValor(calcularClasses([]), 5)).toBeNull()
  })
})
