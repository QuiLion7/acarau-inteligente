import { lerCasos, lerPeriodo } from "@/lib/importacao/valores"

describe("lerPeriodo", () => {
  it.each([
    ["2025", { periodo: "2025", granularidade: "ano" }],
    [" 2026 ", { periodo: "2026", granularidade: "ano" }],
    ["2025-01", { periodo: "2025-01", granularidade: "mes" }],
    ["2025-12", { periodo: "2025-12", granularidade: "mes" }],
  ])("aceita %j", (texto, esperado) => {
    expect(lerPeriodo(texto)).toEqual(esperado)
  })

  it.each([
    "2025-13",
    "2025-00",
    "25",
    "20255",
    "2025-1",
    "2025/03",
    "jan/2025",
    "",
  ])("recusa o período %j", (texto) => {
    expect(lerPeriodo(texto)).toBeNull()
  })
})

describe("lerCasos", () => {
  it.each([
    ["0", 0],
    ["9", 9],
    [" 42 ", 42],
    ["1.234", 1234],
    ["12.345.678", 12345678],
    ["2147483647", 2147483647],
  ])("lê %j como %d", (texto, casos) => {
    expect(lerCasos(texto)).toEqual({ tipo: "valor", casos })
  })

  it.each(["", "   "])("célula vazia %j é sem dado, não zero", (texto) => {
    expect(lerCasos(texto)).toEqual({ tipo: "vazio" })
  })

  it.each([
    ["-3", "CASOS_NEGATIVO"],
    ["-1,5", "CASOS_NEGATIVO"],
    ["12,5", "CASOS_DECIMAL"],
    ["12.5", "CASOS_DECIMAL"],
    ["1.23", "CASOS_DECIMAL"],
    ["abc", "CASOS_NAO_NUMERICO"],
    ["1e3", "CASOS_NAO_NUMERICO"],
    ["12 casos", "CASOS_NAO_NUMERICO"],
    ["1.2345", "CASOS_DECIMAL"],
    ["2147483648", "CASOS_NAO_NUMERICO"],
    ["99999999999999999999", "CASOS_NAO_NUMERICO"],
  ])("recusa %j com %s", (texto, codigo) => {
    expect(lerCasos(texto)).toEqual({ tipo: "erro", codigo })
  })
})
