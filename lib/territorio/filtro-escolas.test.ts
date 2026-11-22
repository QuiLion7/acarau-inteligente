import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

import {
  contarMarcadores,
  filtrarEscolas,
  haFiltroAtivo,
  SEM_FILTROS,
  TODAS,
  totalDeMarcadores,
  type FiltrosEscolas,
} from "./filtro-escolas"

const { escolas } = obterDadosTerritorio()
const todos: FiltrosEscolas = { ...SEM_FILTROS, bairroId: null }

describe("filtrarEscolas", () => {
  it("sem filtro devolve as 62 escolas do catálogo, na ordem original", () => {
    const resultado = filtrarEscolas(escolas, todos)

    expect(resultado).toHaveLength(62)
    expect(resultado.map(({ codigoInep }) => codigoInep)).toEqual(
      escolas.map(({ codigoInep }) => codigoInep)
    )
  })

  it("combina dependência e localização, e todas as linhas têm esses atributos", () => {
    const resultado = filtrarEscolas(escolas, {
      ...todos,
      dependencia: "Privada",
      localizacao: "Urbana",
    })

    expect(resultado.length).toBeGreaterThan(0)
    expect(resultado.length).toBeLessThan(escolas.length)
    for (const escola of resultado) {
      expect(escola).toMatchObject({
        dependencia: "Privada",
        localizacao: "Urbana",
      })
    }
    const esperadas = escolas.filter(
      (escola) =>
        escola.dependencia === "Privada" && escola.localizacao === "Urbana"
    )
    expect(resultado).toHaveLength(esperadas.length)
  })

  it("o bairro selecionado traz só as escolas dele: 8 no Centro", () => {
    const resultado = filtrarEscolas(escolas, { ...todos, bairroId: "uv-10" })

    expect(resultado).toHaveLength(8)
    expect(resultado.every(({ bairroId }) => bairroId === "uv-10")).toBe(true)
  })

  it("bairro sem escola na base devolve lista vazia, não erro", () => {
    const comEscola = new Set(escolas.map(({ bairroId }) => bairroId))
    const semEscola = ["uv-01", "uv-02", "uv-03", "uv-04", "uv-05"].find(
      (id) => !comEscola.has(id)
    )
    expect(semEscola).toBeDefined()

    expect(filtrarEscolas(escolas, { ...todos, bairroId: semEscola! })).toEqual(
      []
    )
  })

  it.each([
    ["dentro-de-bairro", 24],
    ["fora-da-cobertura", 33],
    ["fora-do-limite", 1],
    ["sem-localizacao", 4],
  ] as const)("a cobertura %s tem %d escolas", (cobertura, total) => {
    expect(filtrarEscolas(escolas, { ...todos, cobertura })).toHaveLength(total)
  })

  it("filtros que não combinam devolvem vazio", () => {
    expect(
      filtrarEscolas(escolas, {
        ...todos,
        cobertura: "sem-localizacao",
        bairroId: "uv-10",
      })
    ).toEqual([])
  })

  it("'todas' não restringe nenhum dos filtros", () => {
    expect(
      filtrarEscolas(escolas, {
        bairroId: null,
        dependencia: TODAS,
        localizacao: TODAS,
        cobertura: TODAS,
        termo: "",
      })
    ).toHaveLength(62)
  })
})

describe("contarMarcadores", () => {
  it("conta 58 marcadores e deixa de fora as 4 escolas sem localização", () => {
    const contagem = contarMarcadores(escolas)

    expect(contagem).toEqual({
      "dentro-de-bairro": 24,
      "fora-da-cobertura": 33,
      "fora-do-limite": 1,
    })
    expect(totalDeMarcadores(contagem)).toBe(58)
  })

  it("lista vazia não tem marcador", () => {
    expect(Object.values(contarMarcadores([])).every((n) => n === 0)).toBe(true)
  })
})

describe("filtrarEscolas com termo (TU-18, CA-03.22)", () => {
  const comTermo = (termo: string) =>
    filtrarEscolas(escolas, { ...todos, termo })

  it("busca pelo código INEP completo e acha a escola fora do limite municipal", () => {
    const resultado = comTermo("23000910")

    expect(resultado.map(({ codigoInep }) => codigoInep)).toEqual(["23000910"])
    expect(resultado[0]?.estado).toBe("fora-do-limite")
  })

  it("busca por trecho do código, só com dígitos", () => {
    const resultado = comTermo("2300091")

    expect(resultado.length).toBeGreaterThan(0)
    expect(
      resultado.every(({ codigoInep }) => codigoInep.includes("2300091"))
    ).toBe(true)
  })

  it("busca por trecho do nome sem acento, em qualquer caixa e com espaços a mais", () => {
    // O catálogo real vem sem acento; a escola com acento é fixture para provar a normalização dos dois lados.
    const comAcento = { ...escolas[0]!, nome: "EEF José de Alencar" }

    for (const termo of [
      "jose",
      "  JOSÉ  ",
      "José de ALENCAR",
      "alencar jose",
    ]) {
      expect(filtrarEscolas([comAcento], { ...todos, termo }).length).toBe(
        termo === "alencar jose" ? 0 : 1
      )
    }
  })

  it("busca por trecho do nome acha escola do catálogo real", () => {
    const [primeira] = escolas
    const trecho = primeira!.nome.slice(2, 9).toLowerCase()

    expect(comTermo(trecho).map(({ codigoInep }) => codigoInep)).toContain(
      primeira!.codigoInep
    )
  })

  it("termo com letras não casa com o código INEP", () => {
    expect(comTermo("23000910x")).toEqual([])
  })

  it("termo vazio ou só com espaços não restringe", () => {
    expect(comTermo("")).toHaveLength(62)
    expect(comTermo("   ")).toHaveLength(62)
  })

  it("termo que não existe devolve lista vazia", () => {
    expect(comTermo("zzzzzz")).toEqual([])
  })

  it("combina com os outros filtros e com o bairro", () => {
    const [primeira] = escolas.filter(({ bairroId }) => bairroId === "uv-10")
    expect(primeira).toBeDefined()

    const noCentro = filtrarEscolas(escolas, {
      ...todos,
      bairroId: "uv-10",
      termo: primeira!.codigoInep,
    })
    const noutroBairro = filtrarEscolas(escolas, {
      ...todos,
      bairroId: "uv-01",
      termo: primeira!.codigoInep,
    })

    expect(noCentro.map(({ codigoInep }) => codigoInep)).toEqual([
      primeira!.codigoInep,
    ])
    expect(noutroBairro).toEqual([])
  })
})

describe("filtrarEscolas com dependência e localização (TU-19, CA-03.21)", () => {
  it("Estadual com Rural devolve só escolas com os dois atributos, e a combinação é menor que cada filtro sozinho", () => {
    const combinado = filtrarEscolas(escolas, {
      ...todos,
      dependencia: "Estadual",
      localizacao: "Rural",
    })
    const soEstadual = filtrarEscolas(escolas, {
      ...todos,
      dependencia: "Estadual",
    })
    const soRural = filtrarEscolas(escolas, { ...todos, localizacao: "Rural" })

    for (const escola of combinado) {
      expect(escola).toMatchObject({
        dependencia: "Estadual",
        localizacao: "Rural",
      })
    }
    expect(combinado.length).toBe(
      escolas.filter(
        ({ dependencia, localizacao }) =>
          dependencia === "Estadual" && localizacao === "Rural"
      ).length
    )
    expect(combinado.length).toBeLessThanOrEqual(
      Math.min(soEstadual.length, soRural.length)
    )
  })

  it("combinação sem resultado devolve vazio", () => {
    const resultado = filtrarEscolas(escolas, {
      ...todos,
      cobertura: "fora-do-limite",
      localizacao: "Urbana",
      dependencia: "Federal",
    })

    expect(resultado).toEqual([])
  })
})

describe("haFiltroAtivo", () => {
  it.each([
    ["sem nada ligado", SEM_FILTROS, false],
    ["só a busca", { ...SEM_FILTROS, termo: "escola" }, true],
    ["busca só com espaços", { ...SEM_FILTROS, termo: "  " }, false],
    ["dependência", { ...SEM_FILTROS, dependencia: "Estadual" as const }, true],
    ["localização", { ...SEM_FILTROS, localizacao: "Rural" as const }, true],
    [
      "cobertura",
      { ...SEM_FILTROS, cobertura: "fora-do-limite" as const },
      true,
    ],
  ])("%s", (_caso, filtros, esperado) => {
    expect(haFiltroAtivo(filtros)).toBe(esperado)
  })
})
