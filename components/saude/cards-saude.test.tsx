import { render, screen, within } from "@testing-library/react"

import { CardsSaude } from "@/components/saude/cards-saude"
import {
  type AnalisePeriodo,
  montarAnalisePeriodo,
} from "@/lib/saude/analise-periodo"
import type { VariacaoPeriodo } from "@/lib/saude/variacao-periodo"
import { ANALISE_SAUDE, BAIRROS_SAUDE } from "@/test/saude-fixtures"

const SEM_PERIODO_ANTERIOR: VariacaoPeriodo = { tipo: "sem-periodo-anterior" }

function analiseDe(periodo: string): AnalisePeriodo {
  return montarAnalisePeriodo(ANALISE_SAUDE, periodo, BAIRROS_SAUDE)
}

function renderizar(
  periodo: string,
  variacao: VariacaoPeriodo = SEM_PERIODO_ANTERIOR
) {
  render(
    <CardsSaude
      analise={analiseDe(periodo)}
      variacao={variacao}
      periodo={periodo}
    />
  )
}

const card = (nome: string) => within(screen.getByRole("group", { name: nome }))

describe("CardsSaude: os números do AnalisePeriodo (TU-08, CA-03.01)", () => {
  it("mostra total, bairros com dados, sem dados e fora da cobertura iguais à análise de 2025", () => {
    renderizar("2025")

    expect(card("Total do período").getByText("30 casos")).toBeVisible()
    expect(
      card("Total do período").getByText(
        "Soma dos 3 bairros com dados no período."
      )
    ).toBeVisible()
    expect(card("Bairros com dados").getByText("3")).toBeVisible()
    expect(card("Bairros com dados").getByText("de 4 bairros")).toBeVisible()
    expect(card("Bairros sem dados").getByText("1")).toBeVisible()
    expect(card("Fora da cobertura").getByText("6 casos")).toBeVisible()
    expect(
      card("Fora da cobertura").getByText(
        "em 1 localidade, fora do total e fora do mapa"
      )
    ).toBeVisible()
  })

  it("em 2026 o zero explícito conta como bairro com dados e o vazio não", () => {
    renderizar("2026")

    expect(card("Total do período").getByText("51 casos")).toBeVisible()
    expect(card("Bairros com dados").getByText("2")).toBeVisible()
    expect(card("Bairros sem dados").getByText("2")).toBeVisible()
  })

  it("cada card diz o período em exibição", () => {
    renderizar("2026")

    for (const nome of [
      "Total do período",
      "Bairros com dados",
      "Bairros sem dados",
      "Fora da cobertura",
    ]) {
      expect(card(nome).getByText("Período 2026")).toBeVisible()
    }
  })

  it("sem fora da cobertura no período diz que não há registro, sem mostrar 0", () => {
    renderizar("2026")

    const fora = card("Fora da cobertura")
    expect(fora.getByText("Nenhum registro no período.")).toBeVisible()
    expect(fora.queryByText(/\b0\b/)).toBeNull()
  })

  it("um caso só concorda em número", () => {
    const analise = montarAnalisePeriodo(
      {
        periodos: ["2026"],
        valores: { "uv-10": { "2026": 1 } },
        foraDaCobertura: {},
      },
      "2026",
      BAIRROS_SAUDE
    )

    render(
      <CardsSaude
        analise={analise}
        variacao={SEM_PERIODO_ANTERIOR}
        periodo="2026"
      />
    )

    expect(card("Total do período").getByText("1 caso")).toBeVisible()
    expect(
      card("Total do período").getByText(
        "Soma de 1 bairro com dados no período."
      )
    ).toBeVisible()
  })

  it("sem nenhum bairro com dados o total não mostra número: ausência não vira zero", () => {
    const analise = montarAnalisePeriodo(
      { periodos: ["2026"], valores: {}, foraDaCobertura: {} },
      "2026",
      BAIRROS_SAUDE
    )

    render(
      <CardsSaude
        analise={analise}
        variacao={SEM_PERIODO_ANTERIOR}
        periodo="2026"
      />
    )

    const total = card("Total do período")
    expect(total.getByText("Nenhum bairro tem dados no período.")).toBeVisible()
    expect(total.queryByText(/casos/)).toBeNull()
    expect(card("Bairros sem dados").getByText("4")).toBeVisible()
  })
})

describe("CardsSaude: a variação no card Total (TU-09, CA-03.02 a CA-03.05)", () => {
  it.each<[string, VariacaoPeriodo, string]>([
    [
      "comparada com percentual",
      {
        tipo: "comparada",
        periodoAnterior: "2025",
        bairrosComparados: 2,
        atual: 54,
        anterior: 50,
        absoluta: 4,
        percentual: 8,
      },
      "+4 casos (+8%) em relação a 2025, comparando 2 bairros.",
    ],
    [
      "comparada com base zero: só o absoluto",
      {
        tipo: "comparada",
        periodoAnterior: "2025",
        bairrosComparados: 2,
        atual: 10,
        anterior: 0,
        absoluta: 10,
        percentual: null,
      },
      "+10 casos em relação a 2025, comparando 2 bairros.",
    ],
    [
      "sem período anterior",
      SEM_PERIODO_ANTERIOR,
      "Sem período anterior para comparar.",
    ],
    [
      "sem bairros comparáveis",
      { tipo: "sem-bairros-comparaveis", periodoAnterior: "2025" },
      "Sem bairros comparáveis com 2025.",
    ],
  ])("%s mostra o texto do catálogo", (_caso, variacao, texto) => {
    renderizar("2026", variacao)

    expect(card("Total do período").getByText(texto)).toBeVisible()
  })

  it.each<[string, VariacaoPeriodo]>([
    ["sem período anterior", SEM_PERIODO_ANTERIOR],
    [
      "sem bairros comparáveis",
      { tipo: "sem-bairros-comparaveis", periodoAnterior: "2025" },
    ],
    [
      "comparada sem mudança",
      {
        tipo: "comparada",
        periodoAnterior: "2025",
        bairrosComparados: 2,
        atual: 5,
        anterior: 5,
        absoluta: 0,
        percentual: 0,
      },
    ],
  ])("%s nunca mostra 0%%", (_caso, variacao) => {
    renderizar("2026", variacao)

    expect(screen.queryByText(/\b0%/)).toBeNull()
  })
})
