import { render, screen } from "@testing-library/react"

import PaginaEducacao from "@/app/educacao/page"

jest.mock("@/lib/config/camadas-carregadas", () => ({ CAMADAS_CARREGADAS: [] }))
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/educacao",
  useSearchParams: () => new URLSearchParams(),
}))

describe("PaginaEducacao sem a camada de escolas (TU-29, RN-03.12)", () => {
  it("mostra 'fonte ausente' em vez de números sem fonte", () => {
    render(<PaginaEducacao />)

    expect(
      screen.getByRole("heading", { level: 1, name: "Educação" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Fonte ausente" })
    ).toBeInTheDocument()
    expect(screen.queryByText("62")).not.toBeInTheDocument()
    expect(screen.queryByRole("group")).not.toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })
})
