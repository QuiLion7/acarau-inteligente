import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

import { bairrosParaGeoJson, calcularEnquadramento } from "./geojson-mapa"

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
