import { render, screen } from "@testing-library/react"

import { TotalPeriodo } from "@/components/saude/total-periodo"

describe("TotalPeriodo (TU-16, CA-02.24)", () => {
  it("mostra a soma, diz quantos bairros entraram e separa o fora da cobertura", () => {
    render(
      <TotalPeriodo
        total={{ casos: 1234, bairrosComDados: 18 }}
        foraDaCobertura={{ casos: 6, localidades: 1 }}
      />
    )

    expect(screen.getByText("1.234")).toBeVisible()
    expect(
      screen.getByText("Soma dos 18 bairros com dados no período.")
    ).toBeVisible()
    expect(
      screen.getByText(
        "Fora da cobertura: 6 casos em 1 localidade, fora do total e fora do mapa."
      )
    ).toBeVisible()
  })

  it("com um bairro só concorda em número", () => {
    render(
      <TotalPeriodo
        total={{ casos: 1, bairrosComDados: 1 }}
        foraDaCobertura={{ casos: 0, localidades: 0 }}
      />
    )

    expect(
      screen.getByText("Soma de 1 bairro com dados no período.")
    ).toBeVisible()
    expect(screen.getByText("caso")).toBeVisible()
    expect(
      screen.getByText("Fora da cobertura: nenhum registro no período.")
    ).toBeVisible()
  })

  it("sem nenhum bairro com dados não mostra número: ausência não vira zero", () => {
    render(
      <TotalPeriodo
        total={{ casos: 0, bairrosComDados: 0 }}
        foraDaCobertura={{ casos: 0, localidades: 0 }}
      />
    )

    expect(
      screen.getByText("Nenhum bairro tem dados no período.")
    ).toBeVisible()
    expect(screen.queryByText("0")).toBeNull()
    expect(screen.queryByText(/Soma d/)).toBeNull()
  })
})
