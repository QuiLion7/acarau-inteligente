import { formatarNomeBairro, normalizarParaBusca } from "./nome-bairro"

describe("formatarNomeBairro", () => {
  it.each([
    ["PAULO VI", "Paulo VI"],
    ["SÃO BENEDITO", "São Benedito"],
    ["MONSENHOR EDSON MAGALHÃES", "Monsenhor Edson Magalhães"],
    ["ANTÔNIO LIVINO DA SILVEIRA", "Antônio Livino da Silveira"],
    ["MORADA DOS VENTOS", "Morada dos Ventos"],
    ["AÇUDE NOVO", "Açude Novo"],
    ["CERÂMICA", "Cerâmica"],
    ["VILA VERDE", "Vila Verde"],
    ["  centro  ", "Centro"],
  ])("%s vira %s", (nomeLei, esperado) => {
    expect(formatarNomeBairro(nomeLei)).toBe(esperado)
  })

  it("mantém maiúscula num conectivo que abre o nome", () => {
    expect(formatarNomeBairro("DO CARMO")).toBe("Do Carmo")
  })

  it("não confunde palavra comum com numeral romano", () => {
    expect(formatarNomeBairro("VILA")).toBe("Vila")
  })
})

describe("normalizarParaBusca", () => {
  it.each([
    ["  SÃO   Benedito ", "sao benedito"],
    ["Cerâmica", "ceramica"],
    ["Aranaú", "aranau"],
    ["", ""],
  ])("%j vira %j", (texto, esperado) => {
    expect(normalizarParaBusca(texto)).toBe(esperado)
  })
})
