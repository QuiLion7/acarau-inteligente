import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { FiltroSituacao } from "@/components/obras/filtro-situacao"
import "@/test/polyfill-pointer-event"

describe("FiltroSituacao (TU-15, RF-04.05)", () => {
  it("mostra um chip por situação, todos desmarcados quando nenhuma está escolhida", () => {
    render(<FiltroSituacao situacoes={[]} onChange={jest.fn()} />)

    const chips = screen
      .getAllByRole("button")
      .map((chip) => [chip.textContent, chip.getAttribute("aria-pressed")])
    expect(chips).toEqual([
      ["Planejada", "false"],
      ["Em andamento", "false"],
      ["Concluída", "false"],
      ["Suspensa", "false"],
    ])
    expect(screen.getByRole("group", { name: "Situação" })).toBeVisible()
  })

  it("marca os chips das situações recebidas", () => {
    render(
      <FiltroSituacao
        situacoes={["em_andamento", "suspensa"]}
        onChange={jest.fn()}
      />
    )

    expect(
      screen.getByRole("button", { name: "Em andamento" })
    ).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Planejada" })).toHaveAttribute(
      "aria-pressed",
      "false"
    )
  })

  it("clicar soma a situação às já marcadas, na ordem do catálogo, e clicar de novo a tira", async () => {
    const usuario = userEvent.setup()
    const onChange = jest.fn()
    const { rerender } = render(
      <FiltroSituacao situacoes={["suspensa"]} onChange={onChange} />
    )

    await usuario.click(screen.getByRole("button", { name: "Planejada" }))
    expect(onChange).toHaveBeenLastCalledWith(["planejada", "suspensa"])

    rerender(<FiltroSituacao situacoes={["suspensa"]} onChange={onChange} />)
    await usuario.click(screen.getByRole("button", { name: "Suspensa" }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it("funciona só com o teclado: Tab chega ao chip e Espaço o marca", async () => {
    const usuario = userEvent.setup()
    const onChange = jest.fn()
    render(<FiltroSituacao situacoes={[]} onChange={onChange} />)

    await usuario.tab()
    await usuario.keyboard(" ")

    expect(onChange).toHaveBeenCalledWith(["planejada"])
  })
})
