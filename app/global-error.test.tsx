import { render, screen } from "@testing-library/react"

import ErroGlobal from "@/app/global-error"

jest.mock("@/app/globals.css", () => ({}))

describe("global-error", () => {
  it("traz documento pt-BR próprio com selo, aviso alcançável e caminho de volta", () => {
    render(<ErroGlobal error={new Error("falha")} retry={jest.fn()} />, {
      container: document,
    })

    expect(document.documentElement).toHaveAttribute("lang", "pt-BR")
    expect(
      screen.getByRole("link", { name: "Demonstração Independente" })
    ).toHaveAttribute("href", "/sobre")
    expect(
      screen.getByRole("heading", { level: 1, name: "Algo deu errado" })
    ).toBeVisible()
    expect(
      screen.getByRole("link", { name: "Voltar ao início" })
    ).toHaveAttribute("href", "/")
  })
})
