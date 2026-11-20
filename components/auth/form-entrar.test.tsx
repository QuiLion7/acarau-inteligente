import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { FormEntrar } from "@/components/auth/form-entrar"
import { ApiError } from "@/lib/api/api-error"
import { authClient } from "@/lib/api/auth-client"
import { renderComProviders } from "@/test/render-com-providers"

const replace = jest.fn()
const refresh = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}))
jest.mock("@/lib/api/auth-client", () => ({
  authClient: { entrar: jest.fn(), sair: jest.fn() },
}))

// `restoreMocks` não zera as chamadas dos jest.fn() criados no módulo.
beforeEach(() => jest.clearAllMocks())

function campo(rotulo: string): HTMLElement {
  const grupo = screen.getByLabelText(rotulo).closest('[data-slot="field"]')
  if (!(grupo instanceof HTMLElement)) throw new Error("campo sem grupo")
  return grupo
}

async function preencherEEnviar(usuario: string, senha: string) {
  await userEvent.type(screen.getByLabelText("Usuário"), usuario)
  await userEvent.type(screen.getByLabelText("Senha"), senha)
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }))
}

describe("FormEntrar", () => {
  it("mostra o erro em cada campo vazio, no próprio campo, e não envia", async () => {
    renderComProviders(<FormEntrar retorno="/" />)

    await userEvent.click(screen.getByRole("button", { name: "Entrar" }))

    expect(
      await within(campo("Usuário")).findByText("Informe o usuário.")
    ).toBeVisible()
    expect(within(campo("Senha")).getByText("Informe a senha.")).toBeVisible()
    expect(screen.getByLabelText("Usuário")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    expect(authClient.entrar).not.toHaveBeenCalled()
  })

  it("limpa o erro de cada campo ao digitar nele e libera o envio", async () => {
    renderComProviders(<FormEntrar retorno="/" />)
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }))
    await screen.findByText("Informe o usuário.")

    await userEvent.type(screen.getByLabelText("Usuário"), "analista")
    expect(screen.queryByText("Informe o usuário.")).toBeNull()
    expect(screen.getByText("Informe a senha.")).toBeVisible()

    await userEvent.type(screen.getByLabelText("Senha"), "segredo")

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled()
    )
    expect(screen.queryByText("Informe a senha.")).toBeNull()
  })

  it("envia usuário e senha e vai para o retorno quando o login dá certo", async () => {
    jest.mocked(authClient.entrar).mockResolvedValue()
    renderComProviders(<FormEntrar retorno="/analista" />)

    await preencherEEnviar("analista", "segredo")

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/analista"))
    expect(authClient.entrar).toHaveBeenCalledWith(
      { usuario: "analista", senha: "segredo" },
      expect.anything()
    )
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("mostra a mensagem do servidor e mantém o usuário digitado quando o login é recusado", async () => {
    jest.mocked(authClient.entrar).mockRejectedValue(
      new ApiError("CREDENCIAIS_INVALIDAS", "Usuário ou senha inválidos.", {
        status: 401,
      })
    )
    renderComProviders(<FormEntrar retorno="/" />)

    await preencherEEnviar("analista", "senha-errada")

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Usuário ou senha inválidos."
    )
    expect(screen.getByLabelText("Usuário")).toHaveValue("analista")
    expect(replace).not.toHaveBeenCalled()
  })

  it("mostra a mensagem de bloqueio com a espera, vinda do servidor", async () => {
    jest
      .mocked(authClient.entrar)
      .mockRejectedValue(
        new ApiError(
          "LOGIN_BLOQUEADO",
          "Muitas tentativas. Tente novamente em 12 minutos.",
          { status: 429, details: { esperaMinutos: 12 } }
        )
      )
    renderComProviders(<FormEntrar retorno="/" />)

    await preencherEEnviar("analista", "x")

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Muitas tentativas. Tente novamente em 12 minutos."
    )
  })

  it("desabilita o botão e indica o andamento enquanto o login está em curso", async () => {
    jest.mocked(authClient.entrar).mockReturnValue(new Promise(() => undefined))
    renderComProviders(<FormEntrar retorno="/" />)

    await preencherEEnviar("analista", "segredo")

    expect(
      await screen.findByRole("button", { name: "Entrando..." })
    ).toBeDisabled()
  })

  it("esconde a senha digitada", () => {
    renderComProviders(<FormEntrar retorno="/" />)

    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password")
  })
})
