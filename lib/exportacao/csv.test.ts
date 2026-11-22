import {
  blobDoCsv,
  formatarDataCsv,
  formatarNumeroCsv,
  gerarCsv,
  type ColunaCsv,
} from "@/lib/exportacao/csv"

type Linha = { nome: string; casos?: number }
const COLUNAS: ColunaCsv<Linha>[] = [
  { cabecalho: "Nome", valor: ({ nome }) => nome },
  { cabecalho: "Casos", valor: ({ casos }) => casos ?? "sem dados" },
]

describe("gerarCsv (TU-08, CA-05.10, CA-05.11)", () => {
  it("começa com o BOM UTF-8, usa ';' e CRLF, traz os cabeçalhos na primeira linha e não tem rodapé", () => {
    const csv = gerarCsv(COLUNAS, [{ nome: "Centro", casos: 51 }])

    expect(csv.startsWith("﻿")).toBe(true)
    expect(csv).toBe("﻿Nome;Casos\r\nCentro;51\r\n")
    expect(csv.split("\r\n")).toEqual(["﻿Nome;Casos", "Centro;51", ""])
  })

  it.each([
    ["=1+1", "'=1+1"],
    ["@SOMA(A1)", "'@SOMA(A1)"],
    ["+55 85 99999", "'+55 85 99999"],
    ["-2+3", "'-2+3"],
    ["\tabc", "'\tabc"],
    ["\rabc", '"\'\rabc"'],
  ])("neutraliza a fórmula %j com o apóstrofo", (entrada, esperado) => {
    const csv = gerarCsv(COLUNAS, [{ nome: entrada }])

    expect(csv.split("\r\n")[1]).toBe(`${esperado};sem dados`)
  })

  it("não mexe em texto que só tem esses caracteres no meio", () => {
    const csv = gerarCsv(COLUNAS, [{ nome: "a=b+c-d@e" }])

    expect(csv.split("\r\n")[1]).toBe("a=b+c-d@e;sem dados")
  })

  it("duplica aspas e cerca de aspas a célula com ';', aspas ou quebra de linha", () => {
    const csv = gerarCsv(COLUNAS, [
      { nome: 'Rua "A"; esquina' },
      { nome: "linha 1\nlinha 2" },
    ])

    const [, primeira, segunda] = csv.split("\r\n")
    expect(primeira).toBe('"Rua ""A""; esquina";sem dados')
    expect(`${segunda}\r\n`).toContain('"linha 1\nlinha 2"')
  })

  it('neutraliza e depois cerca: =HYPERLINK("x";"y") fica como texto entre aspas', () => {
    const csv = gerarCsv(COLUNAS, [{ nome: '=HYPERLINK("http://x";"y")' }])

    expect(csv.split("\r\n")[1]).toBe(
      '"\'=HYPERLINK(""http://x"";""y"")";sem dados'
    )
  })

  it("neutraliza também o cabeçalho, para a regra valer para toda célula escrita", () => {
    const csv = gerarCsv(
      [{ cabecalho: "=cabecalho", valor: () => "x" }],
      [{ nome: "a" }]
    )

    expect(csv.split("\r\n")[0]).toBe("﻿'=cabecalho")
  })

  it("escreve o número com vírgula decimal e sem milhar, e não confunde número negativo com fórmula", () => {
    const csv = gerarCsv(
      [{ cabecalho: "Valor", valor: ({ casos }: Linha) => casos ?? 0 }],
      [
        { nome: "a", casos: 922822.4 },
        { nome: "b", casos: -3 },
        { nome: "c", casos: 0 },
      ]
    )

    expect(csv.split("\r\n").slice(1, 4)).toEqual(["922822,4", "-3", "0"])
  })

  it("preserva acentos e emoji, em UTF-8, nos bytes do arquivo", async () => {
    const csv = gerarCsv(COLUNAS, [{ nome: "Acaraú - São José ✓" }])

    const bytes = new Uint8Array(await blobDoCsv(csv).arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    expect(new TextDecoder("utf-8").decode(bytes.slice(3))).toContain(
      "Acaraú - São José ✓"
    )
    expect(blobDoCsv(csv).type).toBe("text/csv;charset=utf-8")
  })

  it("sem linhas só traz o cabeçalho", () => {
    expect(gerarCsv(COLUNAS, [])).toBe("﻿Nome;Casos\r\n")
  })

  it("recusa número que não é finito, para NaN nunca virar célula", () => {
    expect(() =>
      gerarCsv([{ cabecalho: "n", valor: () => Number.NaN }], [{ nome: "a" }])
    ).toThrow(RangeError)
  })
})

describe("formatarNumeroCsv e formatarDataCsv (RF-05.19)", () => {
  it.each([
    [0, "0"],
    [12, "12"],
    [12.5, "12,5"],
    [1234567.891, "1234567,891"],
    [-0.25, "-0,25"],
  ])("escreve %p como %p", (numero, esperado) => {
    expect(formatarNumeroCsv(numero)).toBe(esperado)
  })

  it("escreve a data ISO como dd/mm/aaaa, sem mudar o dia por fuso", () => {
    expect(formatarDataCsv("2026-12-01")).toBe("01/12/2026")
    expect(formatarDataCsv("2027-01-31")).toBe("31/01/2027")
  })

  it("escreve o instante no dia de Brasília: 01h de 22/11 em UTC ainda é 21/11 em Brasília", () => {
    expect(formatarDataCsv("2026-11-22T01:00:00.000Z")).toBe("21/11/2026")
    expect(formatarDataCsv("2026-11-22T12:00:00.000Z")).toBe("22/11/2026")
  })

  it("recusa data inválida em vez de escrever lixo", () => {
    expect(() => formatarDataCsv("ontem")).toThrow(RangeError)
  })
})
