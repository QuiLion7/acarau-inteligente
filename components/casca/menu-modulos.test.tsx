import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { MenuModulos } from "@/components/casca/menu-modulos"

const usePathname = jest.fn<string, []>()
const useSearchParams = jest.fn<URLSearchParams, []>()

jest.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
  useSearchParams: () => useSearchParams(),
}))

// jsdom não navega: sem isto o clique num link registra "not implemented: navigation".
const impedirNavegacao = (evento: Event) => evento.preventDefault()

beforeEach(() => {
  document.addEventListener("click", impedirNavegacao)
  usePathname.mockReturnValue("/")
  useSearchParams.mockReturnValue(new URLSearchParams())
})

afterEach(() => document.removeEventListener("click", impedirNavegacao))

function menu() {
  return screen.getByRole("navigation", { name: "Módulos" })
}

describe("MenuModulos", () => {
  it("lista os cinco módulos como links para o visitante", () => {
    render(<MenuModulos />)

    const links = screen.getAllByRole("link")
    expect(links.map((link) => link.textContent)).toEqual([
      "Território",
      "Saúde",
      "Educação",
      "Obras",
      "Relatórios",
    ])
    expect(screen.getByRole("link", { name: "Saúde" })).toHaveAttribute(
      "href",
      "/saude"
    )
  })

  it("marca o módulo ativo com aria-current=page e nenhum outro", () => {
    usePathname.mockReturnValue("/educacao")

    render(<MenuModulos />)

    expect(screen.getByRole("link", { name: "Educação" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(menu().querySelectorAll('[aria-current="page"]')).toHaveLength(1)
  })

  it("não marca nenhum módulo na página inicial", () => {
    render(<MenuModulos />)

    expect(menu().querySelector("[aria-current]")).toBeNull()
  })

  it("preserva os filtros bairro e período nos links dos módulos", () => {
    useSearchParams.mockReturnValue(
      new URLSearchParams("bairro=Centro&periodo=2025")
    )

    render(<MenuModulos />)

    expect(screen.getByRole("link", { name: "Obras" })).toHaveAttribute(
      "href",
      "/obras?bairro=Centro&periodo=2025"
    )
  })

  it("só mostra a área do analista e a administração ao papel certo", () => {
    const { rerender } = render(<MenuModulos papel="visitante" />)
    expect(screen.queryByRole("link", { name: "Área do analista" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Administração" })).toBeNull()

    rerender(<MenuModulos papel="analista" />)
    expect(
      screen.getByRole("link", { name: "Área do analista" })
    ).toHaveAttribute("href", "/analista")
    expect(screen.queryByRole("link", { name: "Administração" })).toBeNull()

    rerender(<MenuModulos papel="administrador" />)
    expect(screen.getByRole("link", { name: "Administração" })).toHaveAttribute(
      "href",
      "/admin"
    )
  })

  it("chama onNavegar ao clicar num módulo", async () => {
    const onNavegar = jest.fn()
    render(<MenuModulos onNavegar={onNavegar} />)

    await userEvent.click(screen.getByRole("link", { name: "Obras" }))

    expect(onNavegar).toHaveBeenCalledTimes(1)
  })
})
