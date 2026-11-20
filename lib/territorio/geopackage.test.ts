import {
  decodificarGeometria,
  decodificarMultiPoligono,
  decodificarPonto,
  GeometriaNaoSuportadaErro,
} from "./geopackage"
import {
  blobGpkg,
  quadrado,
  wkbMultiPoligono,
  wkbPoligono,
  wkbPonto,
} from "./__fixtures__/gpkg"

const POSICAO: [number, number] = [380123.5, 9680456.25]
const POLIGONOS = [
  [quadrado(0, 0, 100), quadrado(10, 10, 10)],
  [quadrado(500, 500, 50)],
]
const ENVELOPES = [0, 1, 4] as const

describe("decodificarGeometria", () => {
  describe.each(ENVELOPES)("envelope %i", (envelope) => {
    it.each([true, false])(
      "decodifica Point com little endian = %s",
      (littleEndian) => {
        const blob = blobGpkg(wkbPonto(POSICAO, littleEndian), {
          envelope,
          littleEndian,
        })

        expect(decodificarGeometria(blob)).toEqual({
          tipo: "Point",
          posicao: POSICAO,
        })
      }
    )

    it.each([true, false])(
      "decodifica MultiPolygon com furo e dois polígonos, little endian = %s",
      (littleEndian) => {
        const blob = blobGpkg(wkbMultiPoligono(POLIGONOS, littleEndian), {
          envelope,
          littleEndian,
        })

        expect(decodificarGeometria(blob)).toEqual({
          tipo: "MultiPolygon",
          poligonos: POLIGONOS,
        })
      }
    )
  })

  it("trata Polygon como MultiPolygon de um polígono", () => {
    const blob = blobGpkg(wkbPoligono(POLIGONOS[0]))

    expect(decodificarMultiPoligono(blob)).toEqual([POLIGONOS[0]])
  })

  it("lê a posição de um blob de ponto pelo atalho decodificarPonto", () => {
    expect(decodificarPonto(blobGpkg(wkbPonto(POSICAO)))).toEqual(POSICAO)
  })

  it.each([
    ["LineString", blobGpkg([1, 2, 0, 0, 0])],
    ["blob sem a assinatura GP", Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9])],
    ["blob menor que o cabeçalho", Uint8Array.from([0x47, 0x50])],
    [
      "geometria vazia",
      Uint8Array.from([
        0x47,
        0x50,
        0,
        0b10001,
        0,
        0,
        0,
        0,
        ...wkbPonto([0, 0]),
      ]),
    ],
    [
      "tipo estendido",
      Uint8Array.from([
        0x47,
        0x50,
        0,
        0b100001,
        0,
        0,
        0,
        0,
        ...wkbPonto([0, 0]),
      ]),
    ],
    [
      "indicador de envelope inválido",
      Uint8Array.from([0x47, 0x50, 0, 0b1111, 0, 0, 0, 0, ...wkbPonto([0, 0])]),
    ],
    ["WKB truncado", blobGpkg(wkbPonto(POSICAO).slice(0, 12))],
  ])("lança erro nomeado para %s", (_descricao, blob) => {
    expect(() => decodificarGeometria(blob)).toThrow(GeometriaNaoSuportadaErro)
  })

  it("recusa Point quando se espera polígono e polígono quando se espera Point", () => {
    expect(() => decodificarMultiPoligono(blobGpkg(wkbPonto(POSICAO)))).toThrow(
      GeometriaNaoSuportadaErro
    )
    expect(() => decodificarPonto(blobGpkg(wkbPoligono(POLIGONOS[0])))).toThrow(
      GeometriaNaoSuportadaErro
    )
  })

  it("recusa MultiPolygon que carrega geometria de outro tipo", () => {
    const wkbPontoNoLugarDoPoligono = [
      1,
      6,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      ...wkbPonto(POSICAO),
    ]

    expect(() =>
      decodificarGeometria(blobGpkg(wkbPontoNoLugarDoPoligono))
    ).toThrow(/tipo WKB 1 dentro de MultiPolygon/)
  })
})
