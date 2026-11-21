import {
  escolherMapeamento,
  listarColunasIgnoradas,
  mapeamentoCompleto,
  sugerirMapeamento,
} from "@/lib/importacao/mapeamento-colunas"

describe("sugerirMapeamento (TU-06)", () => {
  it("sugere bairro, ano e casos para bairro,ano,casos", () => {
    expect(sugerirMapeamento(["bairro", "ano", "casos"])).toEqual({
      bairro: 0,
      periodo: 1,
      casos: 2,
    })
  })

  it.each([
    ["Bairro", "Período", "Casos"],
    ["BAIRRO", "PERIODO", "CASOS"],
    ["bairro", "mes", "casos"],
  ])("reconhece o cabeçalho %s, %s, %s sem acento nem caixa", (a, b, c) => {
    expect(sugerirMapeamento([a, b, c])).toEqual({
      bairro: 0,
      periodo: 1,
      casos: 2,
    })
  })

  it("com mais de uma coluna de período prefere periodo, depois ano, depois mes", () => {
    expect(
      sugerirMapeamento(["mes", "bairro", "ano", "periodo", "casos"]).periodo
    ).toBe(3)
    expect(sugerirMapeamento(["mes", "bairro", "ano", "casos"]).periodo).toBe(2)
  })

  it("deixa nulo o campo sem coluna correspondente", () => {
    expect(sugerirMapeamento(["localidade", "quando", "total"])).toEqual({
      bairro: null,
      periodo: null,
      casos: null,
    })
  })
})

describe("colunas ignoradas e mapeamento completo", () => {
  const cabecalho = ["bairro", "ano", "casos", "observacao", "fonte"]

  it("lista as colunas que nenhum campo usa", () => {
    const mapeamento = sugerirMapeamento(cabecalho)

    expect(listarColunasIgnoradas(cabecalho, mapeamento)).toEqual([
      "observacao",
      "fonte",
    ])
  })

  it("com um campo sem coluna, a coluna que sobrou também é ignorada", () => {
    const mapeamento = { bairro: 0, periodo: 1, casos: null }

    expect(listarColunasIgnoradas(cabecalho, mapeamento)).toEqual([
      "casos",
      "observacao",
      "fonte",
    ])
  })

  it.each([
    [{ bairro: 0, periodo: 1, casos: 2 }, true],
    [{ bairro: 0, periodo: 1, casos: null }, false],
    [{ bairro: 0, periodo: 1, casos: 1 }, false],
  ])("mapeamento %j completo: %s", (mapeamento, esperado) => {
    expect(mapeamentoCompleto(mapeamento)).toBe(esperado)
  })

  it("descarta índice fora do cabeçalho e usa a sugestão quando nada foi escolhido", () => {
    expect(
      escolherMapeamento(["bairro", "ano"], {
        bairro: 0,
        periodo: 7,
        casos: -1,
      })
    ).toEqual({ bairro: 0, periodo: null, casos: null })
    expect(escolherMapeamento(["bairro", "ano", "casos"], null)).toEqual({
      bairro: 0,
      periodo: 1,
      casos: 2,
    })
  })
})
