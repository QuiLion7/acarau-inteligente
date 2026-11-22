import {
  legendaDasEscolas,
  legendaDasObras,
  legendaDoCoropletico,
  legendaDosBairros,
  ROTULO_BAIRRO_SELECIONADO,
  ROTULO_LIMITE,
  ROTULO_SEM_DADOS,
  ROTULO_ZERO,
  type ItemLegendaPng,
} from "@/lib/exportacao/legendas-png"
import { calcularClasses } from "@/lib/saude/classes-coropletico"
import { ICONES_ESCOLA, ICONES_OBRA } from "@/lib/territorio/estilo-mapa"

function todosTemFormaERotulo(itens: ItemLegendaPng[]) {
  for (const item of itens) {
    expect(item.forma).toBeTruthy()
    expect(item.rotulo.trim()).not.toBe("")
    expect(item.cor).toMatch(/^#[0-9a-f]{6}$/i)
  }
}

describe("legendas do PNG (TU-10, CA-05.13, DV-20)", () => {
  it("o coroplético tem uma entrada por classe com o rótulo da legenda da tela, mais zero e sem dados", () => {
    const classes = calcularClasses([3, 7, 12, 20, 45, 51])

    const itens = legendaDoCoropletico(classes, false)

    expect(itens).toHaveLength(classes.classes.length + 2)
    expect(itens.slice(0, -2).map(({ rotulo }) => rotulo)).toEqual(
      classes.classes.map(({ rotulo }) => rotulo)
    )
    expect(itens.slice(0, -2).every(({ forma }) => forma === "quadrado")).toBe(
      true
    )
    expect(itens.at(-2)).toMatchObject({
      forma: "tracejado",
      rotulo: ROTULO_ZERO,
    })
    expect(itens.at(-1)).toMatchObject({
      forma: "hachura",
      rotulo: ROTULO_SEM_DADOS,
    })
    todosTemFormaERotulo(itens)
  })

  it("as cores das classes são distintas e zero e sem dados têm forma própria, não só cor", () => {
    const itens = legendaDoCoropletico(
      calcularClasses([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
      false
    )

    const cores = itens.slice(0, -2).map(({ cor }) => cor)
    expect(new Set(cores).size).toBe(cores.length)
    const formasDosEstados = itens.slice(-2).map(({ forma }) => forma)
    expect(new Set(formasDosEstados).size).toBe(2)
    expect(formasDosEstados).not.toContain("quadrado")
  })

  it("com bairro filtrado acrescenta o contorno grosso, e sem ele não", () => {
    const classes = calcularClasses([5])

    expect(
      legendaDoCoropletico(classes, true).map(({ rotulo }) => rotulo)
    ).toContain(ROTULO_BAIRRO_SELECIONADO)
    expect(
      legendaDoCoropletico(classes, false).map(({ rotulo }) => rotulo)
    ).not.toContain(ROTULO_BAIRRO_SELECIONADO)
  })

  it("sem nenhum valor positivo não há classe, mas zero e sem dados continuam na legenda", () => {
    const itens = legendaDoCoropletico(calcularClasses([]), false)

    expect(itens.map(({ rotulo }) => rotulo)).toEqual([
      ROTULO_ZERO,
      ROTULO_SEM_DADOS,
    ])
  })

  it("as obras têm as quatro situações, cada uma com a forma de marcador do mapa", () => {
    const itens = legendaDasObras()

    expect(itens.map(({ rotulo }) => rotulo)).toEqual(
      Object.values(ICONES_OBRA).map(({ rotulo }) => rotulo)
    )
    expect(itens.map(({ forma }) => forma)).toEqual([
      "circulo",
      "triangulo",
      "quadrado",
      "losango",
    ])
    todosTemFormaERotulo(itens)
  })

  it("as escolas têm os três estados com a forma e o rótulo do mapa", () => {
    const itens = legendaDasEscolas()

    expect(itens).toEqual(
      Object.values(ICONES_ESCOLA).map(({ forma, cor, rotulo }) => ({
        forma,
        cor,
        rotulo,
      }))
    )
    expect(new Set(itens.map(({ forma }) => forma)).size).toBe(3)
  })

  it("os bairros trazem o limite tracejado, e o selecionado e o limite são opcionais", () => {
    expect(legendaDosBairros(false).map(({ rotulo }) => rotulo)).toEqual([
      expect.stringContaining("Bairro da sede"),
      ROTULO_LIMITE,
    ])
    expect(legendaDosBairros(true)).toHaveLength(3)
    expect(legendaDosBairros(false, false)).toHaveLength(1)
    todosTemFormaERotulo(legendaDosBairros(true))
  })
})
