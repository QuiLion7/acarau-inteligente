import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import ErroDaRota from "@/app/error"

describe("error", () => {
  it("mostra o erro em pt-BR e deixa tentar de novo", async () => {
    const retry = jest.fn()
    render(<ErroDaRota error={new Error("falha")} retry={retry} />)

    await userEvent.click(
      screen.getByRole("button", { name: "Tentar novamente" })
    )

    expect(screen.getByRole("alert")).toHaveTextContent("Algo deu errado")
    expect(retry).toHaveBeenCalledTimes(1)
  })
})
