import {
  areaMultiPoligono,
  calcularBbox,
  calcularPontoInterior,
  localizarPonto,
  validarAnel,
  type Anel,
  type MultiPoligono,
} from "./geometria"
import { quadrado } from "./__fixtures__/gpkg"

const QUADRADO_COM_FURO: MultiPoligono = [
  [quadrado(0, 0, 100), quadrado(40, 40, 10)],
]
const DOIS_QUADRADOS: MultiPoligono = [
  [quadrado(0, 0, 10)],
  [quadrado(100, 100, 10)],
]

describe("areaMultiPoligono", () => {
  it("desconta o furo da área do contorno externo", () => {
    expect(
      areaMultiPoligono([[quadrado(0, 0, 100), quadrado(10, 10, 10)]])
    ).toBe(9900)
  })

  it("soma os polígonos do multipolígono", () => {
    expect(areaMultiPoligono(DOIS_QUADRADOS)).toBe(200)
  })

  it("não depende do sentido do anel", () => {
    const horario = quadrado(0, 0, 10).toReversed()

    expect(areaMultiPoligono([[horario]])).toBe(100)
  })
})

describe("localizarPonto", () => {
  it.each([
    ["dentro", [20, 20], "dentro"],
    ["aresta do contorno", [0, 50], "fronteira"],
    ["vértice do contorno", [100, 100], "fronteira"],
    ["fora do contorno", [150, 50], "fora"],
    ["dentro do furo", [45, 45], "fora"],
    ["aresta do furo", [40, 45], "fronteira"],
    ["vértice do furo", [50, 50], "fronteira"],
  ] as const)("quadrado com furo, %s", (_descricao, ponto, esperado) => {
    expect(localizarPonto([...ponto], QUADRADO_COM_FURO)).toBe(esperado)
  })

  it.each([
    [[5, 5], "dentro"],
    [[105, 105], "dentro"],
    [[50, 50], "fora"],
    [[10, 5], "fronteira"],
    [[100, 105], "fronteira"],
  ] as const)("multipolígono: %j é %s", (ponto, esperado) => {
    expect(localizarPonto([...ponto], DOIS_QUADRADOS)).toBe(esperado)
  })

  it("trata vértice repetido (aresta de comprimento zero) sem dividir por zero", () => {
    const comRepetido: MultiPoligono = [
      [
        [
          [0, 0],
          [10, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    ]

    expect(localizarPonto([10, 0], comRepetido)).toBe("fronteira")
    expect(localizarPonto([5, 5], comRepetido)).toBe("dentro")
  })

  it("dá dentro quando o ponto está dentro de um polígono e na fronteira de outro", () => {
    const vizinhos: MultiPoligono = [
      [quadrado(0, 0, 10)],
      [quadrado(10, 0, 10)],
      [quadrado(-5, -5, 20)],
    ]

    expect(localizarPonto([10, 5], vizinhos)).toBe("dentro")
  })
})

describe("validarAnel", () => {
  const ANEL_BOM = quadrado(0, 0, 10)

  it.each<[string, Anel, string | null]>([
    ["anel simples e fechado", ANEL_BOM, null],
    ["anel aberto", ANEL_BOM.slice(0, 4), "aberto"],
    [
      "menos de 4 pontos",
      [
        [0, 0],
        [1, 1],
        [0, 0],
      ],
      "poucos-pontos",
    ],
    [
      "coordenada NaN",
      [
        [0, 0],
        [Number.NaN, 1],
        [1, 0],
        [0, 0],
      ],
      "coordenada-invalida",
    ],
    [
      "coordenada infinita",
      [
        [0, 0],
        [Infinity, 1],
        [1, 0],
        [0, 0],
      ],
      "coordenada-invalida",
    ],
    [
      "gravata (autointerseção)",
      [
        [0, 0],
        [10, 10],
        [10, 0],
        [0, 10],
        [0, 0],
      ],
      "autointerseccao",
    ],
    [
      "vértice repetido encostando em outra aresta",
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [5, 0],
        [0, 10],
        [0, 0],
      ],
      "autointerseccao",
    ],
  ])("%s", (_descricao, anel, esperado) => {
    expect(validarAnel(anel)).toBe(esperado)
  })
})

describe("calcularBbox", () => {
  it("devolve oeste, sul, leste e norte de todos os polígonos", () => {
    expect(calcularBbox(DOIS_QUADRADOS)).toEqual([0, 0, 110, 110])
  })
})

describe("calcularPontoInterior", () => {
  it("devolve ponto dentro de um polígono em L, onde o centro do bbox cai fora", () => {
    const emL: MultiPoligono = [
      [
        [
          [0, 0],
          [100, 0],
          [100, 10],
          [10, 10],
          [10, 100],
          [0, 100],
          [0, 0],
        ],
      ],
    ]

    expect(localizarPonto(calcularPontoInterior(emL), emL)).toBe("dentro")
  })

  it("evita o furo do polígono", () => {
    const [x, y] = calcularPontoInterior(QUADRADO_COM_FURO)

    expect(localizarPonto([x, y], QUADRADO_COM_FURO)).toBe("dentro")
  })

  it("escolhe o maior polígono de um multipolígono", () => {
    const [x] = calcularPontoInterior([
      [quadrado(0, 0, 10)],
      [quadrado(100, 0, 50)],
    ])

    expect(x).toBeGreaterThan(100)
  })

  it("lança erro quando não há interior (polígono degenerado)", () => {
    const degenerado: MultiPoligono = [
      [
        [
          [0, 0],
          [10, 0],
          [20, 0],
          [0, 0],
        ],
      ],
    ]

    expect(() => calcularPontoInterior(degenerado)).toThrow(/ponto interior/)
  })
})
