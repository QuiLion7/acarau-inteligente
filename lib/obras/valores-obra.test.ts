import {
  arredondarCoordenada,
  formatarCoordenada,
  formatarData,
  formatarInstante,
  formatarValorEmReais,
  formatarValorParaCampo,
  lerCoordenada,
  lerValorEmReais,
  VALOR_MAXIMO_CENTAVOS,
} from "./valores-obra"

describe("lerCoordenada", () => {
  it.each([
    ["-2,885116", -2.885116],
    ["-2.885116", -2.885116],
    ["  -40,118958 ", -40.118958],
    ["0", 0],
    ["10", 10],
  ])("lê %j como %d", (texto, esperado) => {
    expect(lerCoordenada(texto)).toBe(esperado)
  })

  it.each(["", "abc", "1,2,3", "1.2.3", "--1", "1e3", "2,", ",5", "1 2"])(
    "recusa %j",
    (texto) => {
      expect(lerCoordenada(texto)).toBeNull()
    }
  )
})

describe("arredondarCoordenada", () => {
  it("grava a coordenada com 6 casas decimais", () => {
    expect(arredondarCoordenada(-2.88511649)).toBe(-2.885116)
    expect(arredondarCoordenada(-2.8851166)).toBe(-2.885117)
  })
})

describe("lerValorEmReais", () => {
  it.each([
    ["250.000,00", 25_000_000],
    ["250000,5", 25_000_050],
    ["250000", 25_000_000],
    ["1.234", 123_400],
    ["0", 0],
    ["0,01", 1],
    ["10.000.000.000,00", VALOR_MAXIMO_CENTAVOS],
  ])("lê %j como %d centavos", (texto, centavos) => {
    expect(lerValorEmReais(texto)).toBe(centavos)
  })

  it.each([
    "",
    "abc",
    "1,2,3",
    "-1",
    "12.34",
    "1,234",
    "1.2345,00",
    "R$ 10,00",
    "99999999999999999999",
  ])("recusa %j", (texto) => {
    expect(lerValorEmReais(texto)).toBeNull()
  })

  it("lê o valor acima do teto sem recusar: quem confere o teto é o schema", () => {
    expect(lerValorEmReais("10.000.000.000,01")).toBe(VALOR_MAXIMO_CENTAVOS + 1)
  })
})

describe("formatação", () => {
  it("escreve o valor em reais com milhar e centavos", () => {
    expect(formatarValorEmReais(25_000_000).replace(/\s/g, " ")).toBe(
      "R$ 250.000,00"
    )
    expect(formatarValorEmReais(0).replace(/\s/g, " ")).toBe("R$ 0,00")
  })

  it("devolve o valor como ele volta ao campo do formulário", () => {
    expect(formatarValorParaCampo(25_000_000)).toBe("250.000,00")
    expect(lerValorEmReais(formatarValorParaCampo(123_456_789))).toBe(
      123_456_789
    )
  })

  it("escreve a coordenada em pt-BR com até 6 casas, e o texto volta a ser lido como o mesmo número", () => {
    expect(formatarCoordenada(-2.885116)).toBe("-2,885116")
    expect(formatarCoordenada(-40.1)).toBe("-40,1")
    expect(lerCoordenada(formatarCoordenada(-40.118958))).toBe(-40.118958)
  })

  it("escreve a data de calendário sem mexer no dia por causa do fuso", () => {
    expect(formatarData("2026-12-01")).toBe("01/12/2026")
  })

  it("escreve o instante no horário de Brasília", () => {
    expect(formatarInstante("2026-11-21T14:05:00.000Z")).toBe(
      "21/11/2026 11:05"
    )
    expect(formatarInstante("2026-11-22T02:30:00.000Z")).toBe(
      "21/11/2026 23:30"
    )
  })
})
