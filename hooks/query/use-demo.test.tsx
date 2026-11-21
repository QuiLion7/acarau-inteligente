import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { toast } from "sonner"

import { datasetsQueryKeys } from "@/hooks/query/use-datasets"
import { useReiniciarDemo } from "@/hooks/query/use-demo"
import { ApiError } from "@/lib/api/api-error"
import { demoClient } from "@/lib/api/demo-client"

const refresh = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/lib/api/demo-client", () => ({
  demoClient: { reiniciar: jest.fn() },
}))

let queryClient: QueryClient

function envolver({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
})

describe("useReiniciarDemo", () => {
  it("invalida os datasets, relê as páginas do servidor e avisa", async () => {
    jest.mocked(demoClient.reiniciar).mockResolvedValue()
    const invalidar = jest.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useReiniciarDemo(), {
      wrapper: envolver,
    })

    act(() => result.current.mutate())

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Demonstração reiniciada.")
    )
    expect(invalidar).toHaveBeenCalledWith({ queryKey: datasetsQueryKeys.all })
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("mostra a mensagem do servidor e não relê nada quando falha", async () => {
    jest
      .mocked(demoClient.reiniciar)
      .mockRejectedValue(new ApiError("SEM_PERMISSAO", "Sem permissão."))
    const { result } = renderHook(() => useReiniciarDemo(), {
      wrapper: envolver,
    })

    act(() => result.current.mutate())

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Sem permissão.")
    )
    expect(refresh).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })
})
