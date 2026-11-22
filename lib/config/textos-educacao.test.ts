import { TEXTOS_EDUCACAO } from "@/lib/config/textos-educacao"

describe("TEXTOS_EDUCACAO", () => {
  it.each([
    [0, "Nenhuma escola fora do limite municipal."],
    [1, "A escola fora do limite municipal é citada à parte."],
    [3, "As 3 escolas fora do limite municipal são citadas à parte."],
  ])(
    "diz a escola fora do limite no singular ou no plural conforme o total (%i)",
    (total, texto) => {
      expect(TEXTOS_EDUCACAO.cards.foraDaCobertura.detalhe(total)).toBe(texto)
    }
  )

  it.each([
    [0, "0 na base disponível"],
    [1, "1 escola"],
    [8, "8 escolas"],
  ])(
    "mostra zero escolas como zero da base disponível, nunca como bairro sem escola (%i)",
    (total, texto) => {
      expect(TEXTOS_EDUCACAO.cards.bairro.valor(total)).toBe(texto)
    }
  )
})
