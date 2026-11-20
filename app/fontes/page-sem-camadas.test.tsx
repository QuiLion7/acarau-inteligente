import { render, screen } from "@testing-library/react"

import PaginaFontes from "@/app/fontes/page"

jest.mock("@/lib/config/camadas-carregadas", () => ({ CAMADAS_CARREGADAS: [] }))

describe("PaginaFontes sem camada carregada (PA-01.04)", () => {
  it("diz que nenhuma camada foi carregada e não lista cartão", () => {
    render(<PaginaFontes />)

    expect(
      screen.getByRole("heading", {
        name: "Nenhuma camada de dados foi carregada ainda",
      })
    ).toBeInTheDocument()
    expect(screen.queryAllByRole("article")).toHaveLength(0)
  })
})
