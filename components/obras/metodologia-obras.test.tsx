import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { MetodologiaObras } from "@/components/obras/metodologia-obras"

const REGRA = "Regra de fronteira do artefato: o ponto vai para a menor UV."

describe("MetodologiaObras (TU-17, CA-04.28)", () => {
  it("começa recolhida", () => {
    render(<MetodologiaObras regraFronteira={REGRA} />)

    expect(
      screen.getByRole("button", { name: "Como os números são calculados" })
    ).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText(REGRA)).toBeNull()
  })

  it("aberta mostra a regra de fronteira do artefato, a obra sem ponto e que o valor previsto não é execução financeira", async () => {
    const usuario = userEvent.setup()
    render(<MetodologiaObras regraFronteira={REGRA} />)

    await usuario.click(
      screen.getByRole("button", { name: "Como os números são calculados" })
    )

    expect(screen.getByText(REGRA)).toBeVisible()
    expect(
      screen.getByText(/Obra sem localização não aparece no mapa/)
    ).toBeVisible()
    expect(
      screen.getByText(/O valor previsto não é execução financeira/)
    ).toBeVisible()
    expect(
      screen.getByText(/bairro da obra é calculado a partir do ponto/)
    ).toBeVisible()
    expect(screen.getByText(/Não são obras municipais/)).toBeVisible()
  })
})
