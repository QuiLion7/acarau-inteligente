import { render, screen } from "@testing-library/react"

import PaginaEducacao from "@/app/educacao/page"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/educacao",
  useSearchParams: () => new URLSearchParams(),
}))

describe("PaginaEducacao", () => {
  it("deixa de ser 'em breve' (PA-03.06): título, cards da base e lista de escolas", () => {
    render(<PaginaEducacao />)

    expect(
      screen.getByRole("heading", { level: 1, name: "Educação" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("group", { name: "Registros na base" })
    ).toHaveTextContent("62")
    expect(
      screen.getByRole("heading", { name: "Lista de escolas" })
    ).toBeInTheDocument()
    expect(screen.queryByText("Disponível em breve")).not.toBeInTheDocument()
  })

  it("a fonte e a data de referência dos cards vêm da camada de escolas carregada", () => {
    render(<PaginaEducacao />)

    expect(
      screen.getByRole("group", { name: "Registros na base" })
    ).toHaveTextContent(
      "Fonte: Catálogo de escolas do INEP (CSV fornecido). Data de referência: Não informada."
    )
  })
})
