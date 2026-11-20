import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ErroInesperado } from "@/components/estados/erro-inesperado"

describe("ErroInesperado", () => {
  it("mostra a mensagem em pt-BR e nunca a mensagem nem a stack do erro", () => {
    const erro = new Error(
      "connect ECONNREFUSED 10.0.0.5:5432 em /app/lib/db.ts"
    )

    render(<ErroInesperado error={erro} retry={jest.fn()} />)

    expect(
      screen.getByRole("heading", { level: 1, name: "Algo deu errado" })
    ).toBeVisible()
    expect(screen.queryByText(/ECONNREFUSED|\/app\/lib|\.ts/)).toBeNull()
    expect(
      screen.getByText(
        "Ocorreu um problema inesperado. Tente novamente em instantes."
      )
    ).toBeVisible()
  })

  it("mostra o código de referência quando o erro traz digest", () => {
    const erro = Object.assign(new Error("interno"), { digest: "a1b2c3" })

    render(<ErroInesperado error={erro} retry={jest.fn()} />)

    expect(screen.getByText(/Código de referência: a1b2c3\./)).toBeVisible()
  })

  it("ignora valor lançado que não é um erro", () => {
    render(<ErroInesperado error="texto solto" retry={jest.fn()} />)

    expect(screen.queryByText(/texto solto/)).toBeNull()
    expect(screen.queryByText(/Código de referência/)).toBeNull()
  })

  it("tenta de novo ao clicar no botão e oferece o caminho de volta", async () => {
    const retry = jest.fn()
    render(<ErroInesperado error={new Error("x")} retry={retry} />)

    await userEvent.click(
      screen.getByRole("button", { name: "Tentar novamente" })
    )

    expect(retry).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole("link", { name: "Voltar ao início" })
    ).toHaveAttribute("href", "/")
  })
})
