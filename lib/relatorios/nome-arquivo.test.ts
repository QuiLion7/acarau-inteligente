import { nomeArquivo, paraTrechoDeNome } from "@/lib/relatorios/nome-arquivo"

const DATA = new Date("2026-11-22T15:00:00.000Z")

describe("nomeArquivo (TU-07, CA-05.31)", () => {
  it("junta produto, tipo, data e bairro, em ASCII, sem acento", () => {
    expect(
      nomeArquivo({
        tipo: "relatorio",
        data: DATA,
        bairro: "São José",
        extensao: "pdf",
      })
    ).toBe("acarau-inteligente_relatorio_2026-11-22_sao-jose.pdf")
  })

  it("sem bairro (todos os bairros) o nome não leva o trecho do bairro", () => {
    expect(
      nomeArquivo({ tipo: "relatorio", data: DATA, extensao: "pdf" })
    ).toBe("acarau-inteligente_relatorio_2026-11-22.pdf")
    expect(
      nomeArquivo({ tipo: "obras", data: DATA, bairro: null, extensao: "csv" })
    ).toBe("acarau-inteligente_obras_2026-11-22.csv")
    expect(
      nomeArquivo({ tipo: "mapa", data: DATA, bairro: "  ", extensao: "png" })
    ).toBe("acarau-inteligente_mapa_2026-11-22.png")
  })

  it("usa o dia de Brasília: 22h30 de 21/11 em Brasília ainda é 21/11, mesmo já sendo 22/11 em UTC", () => {
    const noiteDeBrasilia = new Date("2026-11-22T01:30:00.000Z")

    expect(
      nomeArquivo({ tipo: "relatorio", data: noiteDeBrasilia, extensao: "pdf" })
    ).toContain("_2026-11-21")
  })

  it.each([
    ["Morada dos Ventos", "morada-dos-ventos"],
    ["  Centro  ", "centro"],
    ["Acaraú / Sede (UV 10)", "acarau-sede-uv-10"],
    ["../../etc/passwd", "etc-passwd"],
    ['a"b<c>d:e|f?g*h\\i', "a-b-c-d-e-f-g-h-i"],
    ["Ünïcödé çãõ", "unicode-cao"],
    ["", ""],
    ["---", ""],
  ])("transforma %p em %p", (entrada, esperado) => {
    expect(paraTrechoDeNome(entrada)).toBe(esperado)
  })

  it("o nome final nunca tem barra, ponto fora da extensão, espaço nem caractere não ASCII", () => {
    const nome = nomeArquivo({
      tipo: "Relatório de Obras",
      data: DATA,
      bairro: "../Zé do Pé: sede?",
      extensao: "csv",
    })

    expect(nome).toMatch(/^[a-z0-9_.-]+$/)
    expect(nome.replace(/\.csv$/, "")).not.toContain(".")
    expect(nome).toBe(
      "acarau-inteligente_relatorio-de-obras_2026-11-22_ze-do-pe-sede.csv"
    )
  })

  it("tipo vazio vira 'arquivo', para o nome não ficar com dois sublinhados", () => {
    expect(nomeArquivo({ tipo: "  ", data: DATA, extensao: "png" })).toBe(
      "acarau-inteligente_arquivo_2026-11-22.png"
    )
  })
})
