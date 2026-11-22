import { atribuirPonto, type BairroGeometrico } from "./atribuicao-ponto"
import { quadrado } from "./__fixtures__/gpkg"

// Três bairros lado a lado (x de 0 a 30) e um município que os cobre com folga ao norte.
const BAIRROS: BairroGeometrico[] = [
  { uv: 3, geometria: [[quadrado(20, 0, 10)]] },
  { uv: 1, geometria: [[quadrado(0, 0, 10)]] },
  { uv: 2, geometria: [[quadrado(10, 0, 10)]] },
]
const LIMITE = [[quadrado(-10, -10, 100)]]

describe("atribuirPonto", () => {
  it("devolve sem-localizacao quando não há posição, sem consultar a geometria", () => {
    expect(atribuirPonto(null, LIMITE, BAIRROS)).toEqual({
      estado: "sem-localizacao",
    })
  })

  it("devolve fora-do-limite para ponto fora do município", () => {
    expect(atribuirPonto([500, 500], LIMITE, BAIRROS)).toEqual({
      estado: "fora-do-limite",
    })
  })

  it("devolve fora-da-cobertura para ponto dentro do município e fora de todos os bairros", () => {
    expect(atribuirPonto([5, 50], LIMITE, BAIRROS)).toEqual({
      estado: "fora-da-cobertura",
    })
  })

  it("devolve dentro-de-bairro com a UV, sem marcar fronteira, para ponto no interior", () => {
    expect(atribuirPonto([15, 5], LIMITE, BAIRROS)).toEqual({
      estado: "dentro-de-bairro",
      uvAtribuida: 2,
      uvsTocadas: [2],
      tocouFronteira: false,
    })
  })

  it("atribui ao bairro de menor UV o ponto na fronteira de dois bairros e registra as duas UVs", () => {
    const resultado = atribuirPonto([20, 5], LIMITE, BAIRROS)

    expect(resultado).toEqual({
      estado: "dentro-de-bairro",
      uvAtribuida: 2,
      uvsTocadas: [2, 3],
      tocouFronteira: true,
    })
  })

  it("atribui à menor UV mesmo quando o bairro de menor UV vem depois na lista", () => {
    const invertidos = BAIRROS.toReversed()

    expect(atribuirPonto([10, 5], LIMITE, invertidos)).toMatchObject({
      uvAtribuida: 1,
      uvsTocadas: [1, 2],
    })
  })

  it("marca fronteira para ponto no vértice de um único bairro", () => {
    expect(atribuirPonto([0, 0], LIMITE, BAIRROS)).toMatchObject({
      estado: "dentro-de-bairro",
      uvAtribuida: 1,
      tocouFronteira: true,
    })
  })

  it("trata ponto na borda do limite municipal como dentro do município", () => {
    expect(atribuirPonto([-10, 50], LIMITE, BAIRROS)).toEqual({
      estado: "fora-da-cobertura",
    })
  })
})
