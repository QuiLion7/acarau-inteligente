import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { MenuMovel } from "@/components/casca/menu-movel"

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

// jsdom não navega: sem isto o clique num link registra "not implemented: navigation".
const impedirNavegacao = (evento: Event) => evento.preventDefault()

beforeEach(() => document.addEventListener("click", impedirNavegacao))
afterEach(() => document.removeEventListener("click", impedirNavegacao))

describe("MenuMovel", () => {
  it("abre o menu por botão com os cinco módulos", async () => {
    render(<MenuMovel />)
    expect(screen.queryByRole("navigation", { name: "Módulos" })).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }))

    expect(
      await screen.findByRole("navigation", { name: "Módulos" })
    ).toBeInTheDocument()
    expect(screen.getAllByRole("link")).toHaveLength(5)
  })

  it("mostra a área do analista e a administração no menu móvel conforme o papel", async () => {
    render(<MenuMovel papel="analista" />)
    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }))

    expect(
      await screen.findByRole("link", { name: "Área do analista" })
    ).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Administração" })).toBeNull()
  })

  it("fecha o menu ao escolher um módulo", async () => {
    render(<MenuMovel />)
    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }))

    await userEvent.click(await screen.findByRole("link", { name: "Saúde" }))

    await waitFor(() =>
      expect(screen.queryByRole("navigation", { name: "Módulos" })).toBeNull()
    )
  })

  it("tem botão de fechar em português", async () => {
    render(<MenuMovel />)
    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }))

    expect(
      await screen.findByRole("button", { name: "Fechar" })
    ).toBeInTheDocument()
  })
})
