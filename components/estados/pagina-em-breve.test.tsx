import { render, screen } from "@testing-library/react"

import { PaginaEmBreve } from "@/components/estados/pagina-em-breve"
import { moduloPorId } from "@/lib/config/modulos"

describe("PaginaEmBreve", () => {
  it("mostra o módulo e o estado disponível em breve, sem controles", () => {
    render(<PaginaEmBreve modulo={moduloPorId("saude")} />)

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Saúde")
    expect(
      screen.getByRole("heading", { level: 2, name: "Disponível em breve" })
    ).toBeVisible()
    expect(screen.queryByRole("button")).toBeNull()
  })
})
