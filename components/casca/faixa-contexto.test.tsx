import { render, screen, within } from "@testing-library/react"

import { FaixaContexto } from "@/components/casca/faixa-contexto"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"

const useSearchParams = jest.fn<URLSearchParams, []>()

jest.mock("next/navigation", () => ({
  useSearchParams: () => useSearchParams(),
}))

const BAIRROS: BairroResumo[] = [
  { id: "uv-03", uv: 3, nome: "São Benedito", nomeLei: "SÃO BENEDITO" },
  { id: "uv-10", uv: 10, nome: "Centro", nomeLei: "CENTRO" },
]

function faixa() {
  return screen.getByRole("region", { name: "Contexto da consulta" })
}

function renderizarCom(consulta: string) {
  useSearchParams.mockReturnValue(new URLSearchParams(consulta))
  render(<FaixaContexto bairros={BAIRROS} />)
  return within(faixa())
}

describe("FaixaContexto", () => {
  it("mostra município, recorte e Todos para bairro e período quando não há filtro", () => {
    const contexto = renderizarCom("")

    expect(contexto.getByText("Acaraú (CE)")).toBeInTheDocument()
    expect(contexto.getByText("Bairros da sede")).toBeInTheDocument()
    expect(contexto.getByText("Bairro:").nextSibling).toHaveTextContent("Todos")
    expect(contexto.getByText("Período:").nextSibling).toHaveTextContent(
      "Todos"
    )
  })

  it("mostra o nome do bairro do ID da URL e o período, e os mantém no link de Fontes e limitações", () => {
    const contexto = renderizarCom("bairro=uv-10&periodo=2025")

    expect(contexto.getByText("Bairro:").nextSibling).toHaveTextContent(
      "Centro"
    )
    expect(contexto.getByText("Período:").nextSibling).toHaveTextContent("2025")
    expect(
      contexto.getByRole("link", { name: "Fontes e limitações" })
    ).toHaveAttribute("href", "/fontes?bairro=uv-10&periodo=2025")
  })

  it.each([
    ["nome em texto livre (EP-00)", "bairro=Centro"],
    ["ID inexistente", "bairro=uv-99"],
    ["HTML", "bairro=%3Cb%3Ex%3C%2Fb%3E"],
    ["texto longo", `bairro=${"x".repeat(200)}`],
  ])(
    "mostra 'Não reconhecido' e nunca o valor bruto para %s",
    (_caso, consulta) => {
      const contexto = renderizarCom(consulta)

      expect(contexto.getByText("Bairro:").nextSibling).toHaveTextContent(
        "Não reconhecido"
      )
      expect(faixa()).not.toHaveTextContent(/Centro|uv-99|<b>|xxxx/)
      expect(faixa().querySelector("b")).toBeNull()
    }
  )
})
