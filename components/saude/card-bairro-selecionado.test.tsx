import { render, screen } from "@testing-library/react"

import { CardBairroSelecionado } from "@/components/saude/card-bairro-selecionado"
import type { VariacaoPeriodo } from "@/lib/saude/variacao-periodo"
import { BAIRROS_SAUDE, itemDoBairro } from "@/test/saude-fixtures"

const [OUTRA_BANDA, CENTRO, RODAGEM] = BAIRROS_SAUDE
const SEM_ANTERIOR: VariacaoPeriodo = { tipo: "sem-periodo-anterior" }

function renderizar(
  props: Partial<Parameters<typeof CardBairroSelecionado>[0]> & {
    item: Parameters<typeof CardBairroSelecionado>[0]["item"]
  }
) {
  render(
    <CardBairroSelecionado
      posicao={null}
      totalNoRanking={0}
      variacao={SEM_ANTERIOR}
      periodo="2026"
      {...props}
    />
  )
  return screen.getByRole("group", { name: "Bairro selecionado" })
}

describe("CardBairroSelecionado (TU-10, CA-03.06)", () => {
  it("com valor mostra nome, UV, casos, posição e variação do bairro", () => {
    const card = renderizar({
      item: itemDoBairro(CENTRO!, 51),
      posicao: 1,
      totalNoRanking: 2,
      variacao: {
        tipo: "comparada",
        periodoAnterior: "2025",
        bairrosComparados: 1,
        atual: 51,
        anterior: 9,
        absoluta: 42,
        percentual: 466.7,
      },
    })

    expect(card).toHaveTextContent("Centro")
    expect(card).toHaveTextContent("UV 10")
    expect(card).toHaveTextContent("51 casos")
    expect(card).toHaveTextContent("Posição 1 de 2 no ranking")
    expect(card).toHaveTextContent(
      "+42 casos (+466,7%) em relação a 2025, comparando 1 bairro."
    )
  })

  it("Rodagem com zero explícito mostra 'zero' e a posição no ranking, não 'sem dados'", () => {
    const card = renderizar({
      item: itemDoBairro(RODAGEM!, 0),
      posicao: 3,
      totalNoRanking: 3,
    })

    expect(card).toHaveTextContent("Zero casos informados")
    expect(card).toHaveTextContent("Posição 3 de 3 no ranking")
    expect(card).not.toHaveTextContent("Sem dados")
    expect(card).not.toHaveTextContent("Fora do ranking")
  })

  it("bairro sem dados mostra 'sem dados' e 'fora do ranking', sem número nenhum de casos", () => {
    const card = renderizar({
      item: itemDoBairro(OUTRA_BANDA!, null),
      posicao: null,
      totalNoRanking: 2,
      variacao: { tipo: "sem-bairros-comparaveis", periodoAnterior: "2025" },
    })

    expect(card).toHaveTextContent("Sem dados no período")
    expect(card).toHaveTextContent("Fora do ranking")
    expect(card).toHaveTextContent("Sem bairros comparáveis com 2025.")
    expect(card).not.toHaveTextContent(/\d+ casos?\b/)
  })
})
