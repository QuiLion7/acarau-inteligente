import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ControleCamadas } from "@/components/territorio/controle-camadas"

const CAMADAS = [
  { id: "bairros", rotulo: "Bairros" },
  { id: "limite-municipal", rotulo: "Limite municipal" },
] as const

describe("ControleCamadas", () => {
  it("mostra um interruptor por camada recebida, refletindo o que está ligado", () => {
    render(
      <ControleCamadas
        camadas={CAMADAS}
        ligadas={new Set(["bairros"])}
        onAlternar={jest.fn()}
      />
    )

    expect(screen.getAllByRole("switch")).toHaveLength(2)
    expect(screen.getByRole("switch", { name: "Bairros" })).toBeChecked()
    expect(
      screen.getByRole("switch", { name: "Limite municipal" })
    ).not.toBeChecked()
  })

  it("alternar uma camada avisa qual foi, uma vez", async () => {
    const usuario = userEvent.setup()
    const onAlternar = jest.fn()
    render(
      <ControleCamadas
        camadas={CAMADAS}
        ligadas={new Set(["bairros", "limite-municipal"])}
        onAlternar={onAlternar}
      />
    )

    // Pelo rótulo: o clique direto no span do Switch quebra no jsdom (Base UI).
    await usuario.click(screen.getByText("Limite municipal"))

    expect(onAlternar).toHaveBeenCalledTimes(1)
    expect(onAlternar).toHaveBeenCalledWith("limite-municipal")
  })

  it("sem camada carregada não desenha interruptor", () => {
    render(
      <ControleCamadas
        camadas={[]}
        ligadas={new Set()}
        onAlternar={jest.fn()}
      />
    )

    expect(screen.queryByRole("switch")).not.toBeInTheDocument()
  })
})
