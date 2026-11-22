import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

import { montarObra } from "@/lib/obras/__fixtures__/obra"

import {
  bairrosParaGeoJson,
  calcularEnquadramento,
  obrasNoMapa,
  obrasParaGeoJson,
  pontoProvisorioParaGeoJson,
} from "./geojson-mapa"

const { bairros } = obterDadosTerritorio()

const COROPLETICO = {
  "uv-10": { situacao: "valor", classe: 3 },
  "uv-13": { situacao: "zero", classe: null },
  "uv-01": { situacao: "sem-dados", classe: null },
} as const

describe("calcularEnquadramento", () => {
  it("envolve todos os bairros", () => {
    const [[oeste, sul], [leste, norte]] = calcularEnquadramento(bairros)

    for (const { bbox } of bairros) {
      expect(bbox[0]).toBeGreaterThanOrEqual(oeste)
      expect(bbox[1]).toBeGreaterThanOrEqual(sul)
      expect(bbox[2]).toBeLessThanOrEqual(leste)
      expect(bbox[3]).toBeLessThanOrEqual(norte)
    }
  })

  it("com um bairro só devolve o retângulo dele", () => {
    const [centro] = bairros.filter(({ id }) => id === "uv-10")

    expect(calcularEnquadramento([centro!])).toEqual([
      [centro!.bbox[0], centro!.bbox[1]],
      [centro!.bbox[2], centro!.bbox[3]],
    ])
  })

  it("sem bairros falha com erro claro, em vez de enquadrar um lugar qualquer", () => {
    expect(() => calcularEnquadramento([])).toThrow("Sem bairros")
  })
})

describe("bairrosParaGeoJson", () => {
  it("troca os dados do período mantendo geometria e ID dos 24 bairros", () => {
    const geojson = bairrosParaGeoJson(bairros, COROPLETICO)

    expect(geojson.features).toHaveLength(24)
    expect(geojson.features[9]).toMatchObject({
      properties: { id: "uv-10", situacao: "valor", classe: 3 },
      geometry: bairros[9]?.geometria,
    })
  })
})

describe("obras no mapa (TU-07, CA-04.02, RN-04.02)", () => {
  const COM_PONTO = { longitude: -40.118958, latitude: -2.885116 }
  const obras = [
    montarObra({ id: "a", localizacao: COM_PONTO, situacao: "em_andamento" }),
    montarObra({ id: "b", localizacao: null }),
    montarObra({
      id: "c",
      localizacao: { longitude: -40.14, latitude: -2.88 },
    }),
  ]

  it("obra sem ponto fica fora do mapa: marcadores = total menos as sem localização", () => {
    const noMapa = obrasNoMapa(obras)

    expect(noMapa.map(({ id }) => id)).toEqual(["a", "c"])
    expect(obrasParaGeoJson(noMapa).features).toHaveLength(obras.length - 1)
  })

  it("o mapa recebe só o que precisa: id, título, situação e ponto", () => {
    expect(obrasNoMapa(obras)[0]).toEqual({
      id: "a",
      titulo: "DEMO - Obra de teste",
      situacao: "em_andamento",
      ...COM_PONTO,
    })
  })

  it("monta um ponto por obra, com longitude antes da latitude, e o título como propriedade de texto", () => {
    const { features } = obrasParaGeoJson([
      {
        id: "a",
        titulo: "<b>x</b>",
        situacao: "suspensa",
        ...COM_PONTO,
      },
    ])

    expect(features).toEqual([
      {
        type: "Feature",
        properties: { id: "a", titulo: "<b>x</b>", situacao: "suspensa" },
        geometry: { type: "Point", coordinates: [-40.118958, -2.885116] },
      },
    ])
  })

  it("lista vazia dá uma coleção sem features", () => {
    expect(obrasParaGeoJson([]).features).toEqual([])
  })
})

describe("pontoProvisorioParaGeoJson", () => {
  it("desenha o ponto escolhido e, sem ponto, nenhuma feature", () => {
    expect(
      pontoProvisorioParaGeoJson({ longitude: -40.1, latitude: -2.9 }).features
    ).toEqual([
      {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [-40.1, -2.9] },
      },
    ])
    expect(pontoProvisorioParaGeoJson(null).features).toEqual([])
  })
})
