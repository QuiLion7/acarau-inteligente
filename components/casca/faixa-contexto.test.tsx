import { render, screen, within } from "@testing-library/react"

import { FaixaContexto } from "@/components/casca/faixa-contexto"

const useSearchParams = jest.fn<URLSearchParams, []>()

jest.mock("next/navigation", () => ({
  useSearchParams: () => useSearchParams(),
}))

function faixa() {
  return screen.getByRole("region", { name: "Contexto da consulta" })
}

describe("FaixaContexto", () => {
  it("mostra município, recorte e Todos para bairro e período quando não há filtro", () => {
    useSearchParams.mockReturnValue(new URLSearchParams())

    render(<FaixaContexto />)

    const contexto = within(faixa())
    expect(contexto.getByText("Acaraú (CE)")).toBeInTheDocument()
    expect(contexto.getByText("Bairros da sede")).toBeInTheDocument()
    expect(contexto.getByText("Bairro:").nextSibling).toHaveTextContent("Todos")
    expect(contexto.getByText("Período:").nextSibling).toHaveTextContent(
      "Todos"
    )
  })

  it("mostra os filtros da URL e os mantém no link de Fontes e limitações", () => {
    useSearchParams.mockReturnValue(
      new URLSearchParams("bairro=Centro&periodo=2025")
    )

    render(<FaixaContexto />)

    const contexto = within(faixa())
    expect(contexto.getByText("Bairro:").nextSibling).toHaveTextContent(
      "Centro"
    )
    expect(contexto.getByText("Período:").nextSibling).toHaveTextContent("2025")
    expect(
      contexto.getByRole("link", { name: "Fontes e limitações" })
    ).toHaveAttribute("href", "/fontes?bairro=Centro&periodo=2025")
  })
})
