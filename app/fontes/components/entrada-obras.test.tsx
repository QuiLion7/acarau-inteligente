import { render, screen } from "@testing-library/react"

import { EntradaObras } from "@/app/fontes/components/entrada-obras"

describe("EntradaObras (RF-04.34)", () => {
  it("diz a quantidade no singular e no plural, com a data no horário de Brasília", () => {
    const { rerender } = render(
      <EntradaObras
        resumo={{
          quantidade: 1,
          ultimaAtualizacao: "2026-11-22T02:30:00.000Z",
        }}
      />
    )
    const secao = screen.getByRole("region", { name: "Obras cadastradas" })

    expect(secao).toHaveTextContent("Quantidade:1 obra")
    expect(secao).toHaveTextContent("Última atualização:21/11/2026 23:30")

    rerender(
      <EntradaObras
        resumo={{
          quantidade: 200,
          ultimaAtualizacao: "2026-11-22T02:30:00.000Z",
        }}
      />
    )
    expect(secao).toHaveTextContent("Quantidade:200 obras")
  })

  it("marca a origem como sintética e avisa que não são obras municipais, nunca como real", () => {
    render(
      <EntradaObras
        resumo={{
          quantidade: 8,
          ultimaAtualizacao: "2026-11-15T12:00:00.000Z",
        }}
      />
    )

    const secao = screen.getByRole("region", { name: "Obras cadastradas" })
    expect(secao).toHaveTextContent("SINTETICO")
    expect(secao).toHaveTextContent("Origem:Sintética: criadas na demonstração")
    expect(secao).toHaveTextContent(
      "Não são obras municipais: os títulos e os dados são fictícios"
    )
  })

  it("sem obra mostra que não há nenhuma e omite a data em vez de inventar uma", () => {
    render(<EntradaObras resumo={{ quantidade: 0, ultimaAtualizacao: null }} />)

    const secao = screen.getByRole("region", { name: "Obras cadastradas" })
    expect(secao).toHaveTextContent("Quantidade:Nenhuma obra cadastrada")
    expect(secao).not.toHaveTextContent("Última atualização")
  })
})
