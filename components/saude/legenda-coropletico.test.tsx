import { render, screen, within } from "@testing-library/react"

import { LegendaCoropletico } from "@/components/saude/legenda-coropletico"
import { calcularClasses } from "@/lib/saude/classes-coropletico"

const SEM_FORA = { casos: 0, localidades: 0 }

function renderizar(
  valores: number[],
  foraDaCobertura = SEM_FORA,
  periodo = "2025"
) {
  render(
    <LegendaCoropletico
      indicador="Casos notificados (sintético)"
      unidade="casos"
      periodo={periodo}
      classes={calcularClasses(valores)}
      foraDaCobertura={foraDaCobertura}
    />
  )
  return within(screen.getByRole("list", { name: "Classes do mapa" }))
}

describe("LegendaCoropletico (TU-25, CA-02.20)", () => {
  it("tem título, unidade, período e método, e um item por classe, zero, sem dados e fora da cobertura, todos em texto", () => {
    const itens = renderizar([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
      casos: 6,
      localidades: 1,
    })

    expect(
      screen.getByRole("heading", { name: "Casos notificados (sintético)" })
    ).toBeVisible()
    expect(
      screen.getByText(
        "Unidade: casos. Período: 2025. Método: quantis (até 5 classes)."
      )
    ).toBeVisible()
    expect(
      itens.getAllByRole("listitem").map((item) => item.textContent)
    ).toEqual([
      "1 a 2 casos",
      "3 a 4 casos",
      "5 a 6 casos",
      "7 a 8 casos",
      "9 a 10 casos",
      "Zero informado (0 casos)",
      "Sem dados",
      "Fora da cobertura: 6 casos em 1 localidade (não aparece no mapa)",
    ])
  })

  it("com todos os valores iguais mostra uma classe e a explicação da classe única", () => {
    const itens = renderizar([7, 7, 7])

    expect(itens.getByText("7 casos")).toBeVisible()
    expect(
      screen.getByText(
        "Todos os bairros com dados têm o mesmo valor: uma única classe."
      )
    ).toBeVisible()
  })

  it("sem nenhum valor positivo só restam zero e sem dados, com a explicação", () => {
    const itens = renderizar([])

    expect(
      itens.getAllByRole("listitem").map((item) => item.textContent)
    ).toEqual([
      "Zero informado (0 casos)",
      "Sem dados",
      "Fora da cobertura: nenhum registro no período (não aparece no mapa)",
    ])
    expect(screen.getByText(/não há classes de intervalo/)).toBeVisible()
  })
})
