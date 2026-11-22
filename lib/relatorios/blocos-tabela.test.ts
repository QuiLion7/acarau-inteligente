import {
  dividirEmBlocos,
  LINHAS_POR_BLOCO,
} from "@/lib/relatorios/blocos-tabela"

const linhas = (total: number) => Array.from({ length: total }, (_, i) => i + 1)

describe("dividirEmBlocos (RF-05.16)", () => {
  it("o padrão é de 25 linhas por bloco", () => {
    expect(LINHAS_POR_BLOCO).toBe(25)
    expect(dividirEmBlocos(linhas(60)).map((bloco) => bloco.length)).toEqual([
      25, 25, 10,
    ])
  })

  it("no limite: 25 linhas cabem em um bloco e 26 viram dois, sem perder nem repetir linha", () => {
    expect(dividirEmBlocos(linhas(25))).toHaveLength(1)
    const dois = dividirEmBlocos(linhas(26))

    expect(dois.map((bloco) => bloco.length)).toEqual([25, 1])
    expect(dois.flat()).toEqual(linhas(26))
  })

  it("sem linhas não há bloco, e uma linha só é um bloco", () => {
    expect(dividirEmBlocos([])).toEqual([])
    expect(dividirEmBlocos([7])).toEqual([[7]])
  })

  it("aceita outro tamanho e recusa tamanho inválido", () => {
    expect(dividirEmBlocos(linhas(5), 2)).toEqual([[1, 2], [3, 4], [5]])
    for (const invalido of [0, -1, 1.5, Number.NaN]) {
      expect(() => dividirEmBlocos(linhas(3), invalido)).toThrow(RangeError)
    }
  })
})
