import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"

import { BotaoSair } from "@/components/casca/botao-sair"
import { authClient } from "@/lib/api/auth-client"
import { renderComProviders } from "@/test/render-com-providers"

const replace = jest.fn()
const refresh = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/lib/api/auth-client", () => ({
  authClient: { entrar: jest.fn(), sair: jest.fn() },
}))

// `restoreMocks` não zera as chamadas dos jest.fn() criados no módulo.
beforeEach(() => jest.clearAllMocks())

describe("BotaoSair", () => {
  it("encerra a sessão, volta ao início e avisa que a sessão foi encerrada", async () => {
    jest.mocked(authClient.sair).mockResolvedValue()
    renderComProviders(<BotaoSair />)

    await userEvent.click(screen.getByRole("button", { name: "Sair" }))

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"))
    expect(authClient.sair).toHaveBeenCalledTimes(1)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith("Sessão encerrada.")
  })

  it("fica desabilitado enquanto a saída está em curso", async () => {
    jest.mocked(authClient.sair).mockReturnValue(new Promise(() => undefined))
    renderComProviders(<BotaoSair />)

    await userEvent.click(screen.getByRole("button", { name: "Sair" }))

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sair" })).toBeDisabled()
    )
  })
})
