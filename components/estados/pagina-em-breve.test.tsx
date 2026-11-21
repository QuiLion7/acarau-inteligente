import { render, screen } from "@testing-library/react"

import { PaginaEmBreve } from "@/components/estados/pagina-em-breve"
import { moduloPorId } from "@/lib/config/modulos"

// PA-02.01: a Saúde saiu do "em breve"; a Educação (PA-02.07) segue como exemplo.
describe("PaginaEmBreve", () => {
  it("mostra o módulo e o estado disponível em breve, sem controles", () => {
    render(<PaginaEmBreve modulo={moduloPorId("educacao")} />)

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Educação"
    )
    expect(
      screen.getByRole("heading", { level: 2, name: "Disponível em breve" })
    ).toBeVisible()
    expect(screen.queryByRole("button")).toBeNull()
  })
})
