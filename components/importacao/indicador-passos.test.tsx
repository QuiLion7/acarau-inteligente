import { render, screen, within } from "@testing-library/react"

import { IndicadorPassos } from "@/components/importacao/indicador-passos"

const PASSOS = [
  { id: "a", rotulo: "Enviar" },
  { id: "b", rotulo: "Colunas" },
  { id: "c", rotulo: "Validação" },
]

describe("IndicadorPassos", () => {
  it("lista os passos em ordem e anuncia só o atual com aria-current", () => {
    render(<IndicadorPassos passos={PASSOS} atual="b" />)

    const itens = within(
      screen.getByRole("list", { name: "Passos da importação" })
    ).getAllByRole("listitem")
    expect(itens.map((item) => item.textContent)).toEqual([
      "Enviar(concluído)",
      "2Colunas",
      "3Validação",
    ])
    expect(itens.map((item) => item.getAttribute("aria-current"))).toEqual([
      null,
      "step",
      null,
    ])
  })

  it("no primeiro passo nenhum fica concluído", () => {
    render(<IndicadorPassos passos={PASSOS} atual="a" />)

    expect(screen.queryByText("(concluído)")).toBeNull()
  })
})
