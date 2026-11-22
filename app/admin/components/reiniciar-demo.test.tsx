import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ReiniciarDemo } from "@/app/admin/components/reiniciar-demo"
import { ApiError } from "@/lib/api/api-error"
import { demoClient } from "@/lib/api/demo-client"
import { renderComProviders } from "@/test/render-com-providers"

const refresh = jest.fn()

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/lib/api/demo-client", () => ({
  demoClient: { reiniciar: jest.fn() },
}))

const TEXTO_DO_RESET =
  "Reiniciar a demonstração apaga os datasets importados e as obras cadastradas, com seus históricos, e restaura o dataset e as obras de exemplo. Bairros, escolas e camadas não mudam."

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(demoClient.reiniciar).mockResolvedValue()
})

describe("ReiniciarDemo (PA-02.03)", () => {
  it("explica o que o reinício apaga e o que não muda, antes de qualquer clique", () => {
    renderComProviders(<ReiniciarDemo />)

    expect(screen.getByText(TEXTO_DO_RESET)).toBeVisible()
    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(demoClient.reiniciar).not.toHaveBeenCalled()
  })

  it("o clique só abre a confirmação: nada é reiniciado sem confirmar", async () => {
    const usuario = userEvent.setup()
    renderComProviders(<ReiniciarDemo />)

    await usuario.click(
      screen.getByRole("button", { name: "Reiniciar a demonstração" })
    )

    const dialogo = await screen.findByRole("alertdialog")
    expect(within(dialogo).getByText(TEXTO_DO_RESET)).toBeVisible()
    expect(demoClient.reiniciar).not.toHaveBeenCalled()
  })

  it("Cancelar fecha a confirmação sem reiniciar", async () => {
    const usuario = userEvent.setup()
    renderComProviders(<ReiniciarDemo />)
    await usuario.click(
      screen.getByRole("button", { name: "Reiniciar a demonstração" })
    )

    await usuario.click(await screen.findByRole("button", { name: "Cancelar" }))

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    expect(demoClient.reiniciar).not.toHaveBeenCalled()
  })

  it("confirmar reinicia, relê as páginas do servidor e fecha a confirmação", async () => {
    const usuario = userEvent.setup()
    renderComProviders(<ReiniciarDemo />)
    await usuario.click(
      screen.getByRole("button", { name: "Reiniciar a demonstração" })
    )

    await usuario.click(
      await screen.findByRole("button", { name: "Reiniciar" })
    )

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    expect(demoClient.reiniciar).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
  })

  it("se o servidor recusa, a página não é relida e a confirmação fecha", async () => {
    jest
      .mocked(demoClient.reiniciar)
      .mockRejectedValue(
        new ApiError("SEM_PERMISSAO", "Sem permissão.", { status: 403 })
      )
    const usuario = userEvent.setup()
    renderComProviders(<ReiniciarDemo />)
    await usuario.click(
      screen.getByRole("button", { name: "Reiniciar a demonstração" })
    )

    await usuario.click(
      await screen.findByRole("button", { name: "Reiniciar" })
    )

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    expect(refresh).not.toHaveBeenCalled()
  })
})
