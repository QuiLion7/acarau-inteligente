import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { toast } from "sonner"

import { useEntrar, useSair } from "@/hooks/query/use-auth"
import { ApiError } from "@/lib/api/api-error"
import { authClient } from "@/lib/api/auth-client"

const replace = jest.fn()
const refresh = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/lib/api/auth-client", () => ({
  authClient: { entrar: jest.fn(), sair: jest.fn() },
}))

function envolver({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// `restoreMocks` não zera as chamadas dos jest.fn() criados no módulo.
beforeEach(() => jest.clearAllMocks())

describe("useEntrar", () => {
  it("vai para o retorno e relê o cabeçalho quando o login dá certo", async () => {
    jest.mocked(authClient.entrar).mockResolvedValue()
    const { result } = renderHook(() => useEntrar("/analista"), {
      wrapper: envolver,
    })

    act(() => result.current.mutate({ usuario: "analista", senha: "x" }))

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/analista"))
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(authClient.entrar).toHaveBeenCalledWith(
      { usuario: "analista", senha: "x" },
      expect.anything()
    )
  })

  it("não navega e guarda a mensagem do servidor quando o login falha", async () => {
    jest
      .mocked(authClient.entrar)
      .mockRejectedValue(
        new ApiError("CREDENCIAIS_INVALIDAS", "Usuário ou senha inválidos.")
      )
    const { result } = renderHook(() => useEntrar("/"), { wrapper: envolver })

    act(() => result.current.mutate({ usuario: "a", senha: "b" }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe("Usuário ou senha inválidos.")
    expect(replace).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })
})

describe("useSair", () => {
  it("volta ao início, relê o cabeçalho e avisa que a sessão foi encerrada", async () => {
    jest.mocked(authClient.sair).mockResolvedValue()
    const { result } = renderHook(() => useSair(), { wrapper: envolver })

    act(() => result.current.mutate())

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"))
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith("Sessão encerrada.")
  })

  it("mostra a mensagem do servidor e não navega quando sair falha", async () => {
    jest
      .mocked(authClient.sair)
      .mockRejectedValue(
        new ApiError("ORIGEM_INVALIDA", "Origem não permitida.")
      )
    const { result } = renderHook(() => useSair(), { wrapper: envolver })

    act(() => result.current.mutate())

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Origem não permitida.")
    )
    expect(replace).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })
})
