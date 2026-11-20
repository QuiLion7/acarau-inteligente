import {
  arredondarCoordenada,
  projetarMultiPoligono,
  projetarPosicao,
} from "./projecao"

describe("projetarPosicao", () => {
  it("converte UTM 24S em lon/lat na região de Acaraú, com 6 casas", () => {
    // 500000 m é o meridiano central do fuso 24 (-39°); 9680000 m ≈ 2,89° ao sul do equador.
    const [lon, lat] = projetarPosicao([500000, 9680000])

    expect(lon).toBeCloseTo(-39, 6)
    expect(lat).toBeGreaterThan(-3)
    expect(lat).toBeLessThan(-2.8)
    expect(String(lat).split(".")[1].length).toBeLessThanOrEqual(6)
  })

  it("devolve ponto dentro do município de Acaraú para um ponto da sede", () => {
    const [lon, lat] = projetarPosicao([380000, 9680000])

    expect(lon).toBeGreaterThan(-40.3)
    expect(lon).toBeLessThan(-40)
    expect(lat).toBeGreaterThan(-3)
    expect(lat).toBeLessThan(-2.7)
  })
})

describe("projetarMultiPoligono", () => {
  it("mantém a estrutura de polígonos, anéis e pontos", () => {
    const anel: [number, number][] = [
      [380000, 9680000],
      [381000, 9680000],
      [381000, 9681000],
      [380000, 9680000],
    ]

    const projetado = projetarMultiPoligono([[anel, anel], [anel]])

    expect(projetado).toHaveLength(2)
    expect(projetado[0]).toHaveLength(2)
    expect(projetado[0][0]).toHaveLength(4)
    expect(projetado[0][0][0]).toEqual(projetarPosicao([380000, 9680000]))
  })
})

describe("arredondarCoordenada", () => {
  it("arredonda para 6 casas decimais", () => {
    expect(arredondarCoordenada(-40.12345678)).toBe(-40.123457)
  })
})
