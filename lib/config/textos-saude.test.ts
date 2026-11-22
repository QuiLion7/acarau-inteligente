import { TEXTOS_SAUDE } from "@/lib/config/textos-saude"

import type { VariacaoPeriodo } from "@/lib/saude/variacao-periodo"

function comparada(
  parcial: Partial<Extract<VariacaoPeriodo, { tipo: "comparada" }>>
): VariacaoPeriodo {
  return {
    tipo: "comparada",
    periodoAnterior: "2025",
    bairrosComparados: 15,
    atual: 0,
    anterior: 0,
    absoluta: 0,
    percentual: null,
    ...parcial,
  }
}

const VARIACOES: [string, VariacaoPeriodo, string][] = [
  [
    "aumento com percentual",
    comparada({ absoluta: 12, percentual: 8 }),
    "+12 casos (+8%) em relação a 2025, comparando 15 bairros.",
  ],
  [
    "queda com casa decimal",
    comparada({ absoluta: -10, percentual: -12.5 }),
    "-10 casos (-12,5%) em relação a 2025, comparando 15 bairros.",
  ],
  [
    "base zero: só o valor absoluto",
    comparada({ absoluta: 10, percentual: null }),
    "+10 casos em relação a 2025, comparando 15 bairros.",
  ],
  [
    "um caso e um bairro concordam em número",
    comparada({ absoluta: 1, percentual: 50, bairrosComparados: 1 }),
    "+1 caso (+50%) em relação a 2025, comparando 1 bairro.",
  ],
  [
    "sem mudança nunca vira 0%",
    comparada({ absoluta: 0, percentual: 0 }),
    "Sem variação em relação a 2025, comparando 15 bairros.",
  ],
  [
    "primeiro período",
    { tipo: "sem-periodo-anterior" },
    "Sem período anterior para comparar.",
  ],
  [
    "nenhum bairro nos dois períodos",
    { tipo: "sem-bairros-comparaveis", periodoAnterior: "2025" },
    "Sem bairros comparáveis com 2025.",
  ],
]

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
  ...VARIACOES.map(([, , texto]) => texto),
  TEXTOS_SAUDE.cards.semDados.descricao,
  TEXTOS_SAUDE.cards.foraDaCobertura.nenhum,
  TEXTOS_SAUDE.cards.foraDaCobertura.detalhe(2),
  TEXTOS_SAUDE.metodologia.titulo,
  TEXTOS_SAUDE.metodologia.registro,
  TEXTOS_SAUDE.metodologia.total,
  TEXTOS_SAUDE.metodologia.zeroSemDados,
  TEXTOS_SAUDE.metodologia.classes,
  TEXTOS_SAUDE.metodologia.variacao,
  TEXTOS_SAUDE.metodologia.sintetico,
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

  it.each(VARIACOES)("a variação formata: %s", (_caso, variacao, texto) => {
    expect(TEXTOS_SAUDE.variacao(variacao)).toBe(texto)
  })

  it("a localidade fora da cobertura concorda em número", () => {
    expect(TEXTOS_SAUDE.cards.foraDaCobertura.detalhe(1)).toContain(
      "em 1 localidade,"
    )
    expect(TEXTOS_SAUDE.cards.foraDaCobertura.detalhe(3)).toContain(
      "em 3 localidades,"
    )
  })

  it("a faixa e a nota da taxa dizem o que a demonstração é e o que ela não tem", () => {
    expect(TEXTOS_SAUDE.faixaSintetico).toContain("Dados sintéticos")
    expect(TEXTOS_SAUDE.taxa).toContain("população de cada bairro")
  })
})
