import { render, screen } from "@testing-library/react"

import { AvisoMapaBase } from "@/components/territorio/aviso-mapa-base"

describe("AvisoMapaBase", () => {
  it("avisa que o fundo está indisponível e que as camadas continuam visíveis", () => {
    render(<AvisoMapaBase />)

    expect(screen.getByRole("status")).toHaveTextContent(
      "Fundo de mapa indisponível; as camadas da demonstração continuam visíveis."
    )
  })
})
