import { TEXTOS_SAUDE } from "@/lib/config/textos-saude"

const TEXTOS = [
  TEXTOS_SAUDE.faixaSintetico,
  TEXTOS_SAUDE.taxa,
  TEXTOS_SAUDE.total(1),
  TEXTOS_SAUDE.total(18),
  TEXTOS_SAUDE.reset,
  TEXTOS_SAUDE.regraRanking,
  TEXTOS_SAUDE.classeUnica,
  TEXTOS_SAUDE.privado,
  TEXTOS_SAUDE.sessaoExpirada,
  TEXTOS_SAUDE.jaImportado("Roteiro", 2),
  TEXTOS_SAUDE.dadoPessoal.coluna("nome_paciente"),
  TEXTOS_SAUDE.dadoPessoal.linha(3),
]

describe("TEXTOS_SAUDE", () => {
  it("nenhum texto usa travessão nem meia-risca (react-next.md §13)", () => {
    for (const texto of TEXTOS) {
      expect(texto).not.toMatch(/[—–]/)
    }
  })

  it.each([
    [1, "Soma de 1 bairro com dados no período."],
    [18, "Soma dos 18 bairros com dados no período."],
  ])("o total com %i bairro(s) concorda em número", (bairros, texto) => {
    expect(TEXTOS_SAUDE.total(bairros)).toBe(texto)
  })

  it("a faixa e a nota da taxa dizem o que a demonstração é e o que ela não tem", () => {
    expect(TEXTOS_SAUDE.faixaSintetico).toContain("Dados sintéticos")
    expect(TEXTOS_SAUDE.taxa).toContain("população de cada bairro")
  })
})
