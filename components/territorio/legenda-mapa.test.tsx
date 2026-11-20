import { render, screen, within } from "@testing-library/react"

import { LegendaMapa } from "@/components/territorio/legenda-mapa"

describe("LegendaMapa", () => {
  it("diz com texto o que cada símbolo é, sem depender só da cor", () => {
    render(<LegendaMapa marcadoresDeEscola={null} />)

    const itens = within(screen.getByRole("list")).getAllByRole("listitem")
    expect(itens.map((item) => item.textContent)).toEqual([
      "Bairro da sede (Unidade de Vizinhança)",
      "Bairro selecionado (contorno grosso)",
      "Limite municipal (tracejado)",
    ])
  })

  it("informa a cobertura da demonstração: 24 bairros da sede, sem a zona rural", () => {
    render(<LegendaMapa marcadoresDeEscola={null} />)

    expect(screen.getByRole("region", { name: "Legenda" })).toHaveTextContent(
      "A demonstração cobre os 24 bairros (Unidades de Vizinhança) da sede de Acaraú. Localidades da zona rural não estão nessa cobertura."
    )
  })

  it("com a camada de escolas ligada descreve cada ícone com a contagem recebida, não fixa", () => {
    render(
      <LegendaMapa
        marcadoresDeEscola={{
          "dentro-de-bairro": 5,
          "fora-da-cobertura": 1,
          "fora-do-limite": 2,
        }}
      />
    )

    const itens = within(screen.getByRole("list"))
      .getAllByRole("listitem")
      .map((item) => item.textContent)
    expect(itens).toEqual(
      expect.arrayContaining([
        "Escola dentro de bairro: 5 marcadores",
        "Escola fora da cobertura dos bairros: 1 marcador",
        "Escola fora do limite municipal: 2 marcadores",
      ])
    )
    expect(
      screen.getByText(
        "8 estabelecimentos escolares georreferenciados na base disponível."
      )
    ).toBeInTheDocument()
  })

  it("com a camada desligada não fala de escola", () => {
    render(<LegendaMapa marcadoresDeEscola={null} />)

    expect(screen.queryByText(/Escola/)).not.toBeInTheDocument()
  })
})
