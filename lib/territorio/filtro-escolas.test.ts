import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

import {
  contarMarcadores,
  filtrarEscolas,
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
