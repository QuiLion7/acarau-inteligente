import { render, screen } from "@testing-library/react"

import NaoEncontrada from "@/app/not-found"

describe("not-found", () => {
  it("diz em pt-BR que a página não existe e leva de volta ao início", () => {
    render(<NaoEncontrada />)

    expect(
      screen.getByRole("heading", { level: 1, name: "Página não encontrada" })
    ).toBeVisible()
    expect(
      screen.getByRole("link", { name: "Voltar ao início" })
    ).toHaveAttribute("href", "/")
  })
})
