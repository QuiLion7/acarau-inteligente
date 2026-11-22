import { quadrado } from "@/lib/territorio/__fixtures__/gpkg"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

import {
  lerPontoDigitado,
  localizarObra,
  type TerritorioDaObra,
} from "./localizacao-obra"

function bairro(
  id: string,
  uv: number,
  x: number
): TerritorioDaObra["bairros"][number] {
  return {
    id,
    uv,
    geometria: { type: "MultiPolygon", coordinates: [[quadrado(x, 0, 10)]] },
  }
}

// Dois bairros vizinhos (x de 0 a 20) num município maior; o de menor UV é o segundo da lista.
const TERRITORIO_FICTICIO: TerritorioDaObra = {
  limite: [[quadrado(-10, -10, 100)]],
  bairros: [bairro("uv-02", 2, 10), bairro("uv-01", 1, 0)],
}

describe("localizarObra", () => {
  it.each([
    [
      "ponto dentro de um bairro",
      { longitude: 5, latitude: 5 },
      { estado: "dentro-de-bairro", bairroId: "uv-01" },
    ],
    [
      "ponto na divisa entre dois bairros fica no de menor UV",
      { longitude: 10, latitude: 5 },
      { estado: "dentro-de-bairro", bairroId: "uv-01" },
    ],
    [
      "ponto no município e fora dos bairros",
      { longitude: 50, latitude: 50 },
      { estado: "fora-da-cobertura" },
    ],
    [
      "ponto fora do município",
      { longitude: 500, latitude: 50 },
      { estado: "fora-do-limite" },
    ],
    ["obra sem ponto", null, { estado: "sem-localizacao" }],
  ])("classifica %s", (_descricao, ponto, esperado) => {
    expect(localizarObra(ponto, TERRITORIO_FICTICIO)).toEqual(esperado)
  })

  describe("com o território real do artefato", () => {
    const { bairros, limite } = obterDadosTerritorio()
    const territorio: TerritorioDaObra = {
      limite: limite.geometria.coordinates,
      bairros,
    }

    it("devolve uv-10 para o ponto interior do Centro", () => {
      const centro = bairros.find(({ id }) => id === "uv-10")
      const [longitude, latitude] = centro?.pontoInterior ?? [0, 0]

      expect(localizarObra({ longitude, latitude }, territorio)).toEqual({
        estado: "dentro-de-bairro",
        bairroId: "uv-10",
      })
    })

    it("devolve fora da cobertura para um ponto livre dentro do município", () => {
      expect(
        localizarObra({ longitude: -40.14, latitude: -2.88 }, territorio)
      ).toEqual({ estado: "fora-da-cobertura" })
    })

    it("devolve fora do limite para um ponto fora do município", () => {
      expect(
        localizarObra({ longitude: -38.5, latitude: -3.7 }, territorio)
      ).toEqual({ estado: "fora-do-limite" })
    })
  })
})

describe("lerPontoDigitado", () => {
  it.each([
    ["-2,885116", "-40,118958", { latitude: -2.885116, longitude: -40.118958 }],
    ["-2.885116", "-40.118958", { latitude: -2.885116, longitude: -40.118958 }],
    ["-90", "180", { latitude: -90, longitude: 180 }],
  ])("lê %j e %j como o ponto", (latitude, longitude, esperado) => {
    expect(lerPontoDigitado(latitude, longitude)).toEqual(esperado)
  })

  it.each([
    ["só a latitude", "-2,88", ""],
    ["só a longitude", "", "-40,1"],
    ["texto que não é número", "abc", "-40,1"],
    ["latitude acima de 90", "91", "-40,1"],
    ["longitude abaixo de -180", "-2,88", "-181"],
  ])("não forma ponto com %s", (_descricao, latitude, longitude) => {
    expect(lerPontoDigitado(latitude, longitude)).toBeNull()
  })

  it("arredonda para 6 casas, como a rota grava", () => {
    expect(lerPontoDigitado("-2,8851159", "-40,1189581")).toEqual({
      latitude: -2.885116,
      longitude: -40.118958,
    })
  })
})
