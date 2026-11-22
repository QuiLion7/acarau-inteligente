import { render, screen } from "@testing-library/react"

import { LegendaObras } from "@/components/obras/legenda-obras"

describe("LegendaObras (RF-04.03, DV-20)", () => {
  it("escreve o nome de cada situação com a contagem de marcadores, no singular e no plural", () => {
    render(
      <LegendaObras
        marcadoresPorSituacao={{
          planejada: 2,
          em_andamento: 1,
          concluida: 0,
          suspensa: 3,
        }}
      />
    )

    const itens = screen
      .getAllByRole("listitem")
      .map((item) => item.textContent)
    expect(itens).toEqual([
      "Obra planejada: 2 marcadores",
      "Obra em andamento: 1 marcador",
      "Obra concluída: 0 marcadores",
      "Obra suspensa: 3 marcadores",
    ])
  })

  it("diz que a obra sem localização não tem marcador", () => {
    render(
      <LegendaObras
        marcadoresPorSituacao={{
          planejada: 0,
          em_andamento: 0,
          concluida: 0,
          suspensa: 0,
        }}
      />
    )

    expect(
      screen.getByText(
        "Obra sem localização não tem marcador: ela fica só na lista."
      )
    ).toBeVisible()
  })
})
