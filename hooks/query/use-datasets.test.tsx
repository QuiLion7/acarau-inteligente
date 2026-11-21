import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { toast } from "sonner"

import {
  datasetsQueryKeys,
  useDatasets,
  useDespublicar,
  usePublicar,
  useRelatorio,
} from "@/hooks/query/use-datasets"
import { ApiError } from "@/lib/api/api-error"
import { datasetsClient } from "@/lib/api/datasets-client"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/lib/api/datasets-client", () => ({
  datasetsClient: {
    listar: jest.fn(),
    relatorio: jest.fn(),
    publicar: jest.fn(),
    despublicar: jest.fn(),
  },
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
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
})

describe("useDatasets e useRelatorio", () => {
  it("useDatasets lê a lista pelo client", async () => {
    jest.mocked(datasetsClient.listar).mockResolvedValue([])
    const { result } = renderHook(() => useDatasets(), { wrapper: envolver })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })

  it("useRelatorio não consulta enquanto nenhuma versão está aberta", () => {
    renderHook(() => useRelatorio(null), { wrapper: envolver })

    expect(datasetsClient.relatorio).not.toHaveBeenCalled()
  })

  it("useRelatorio consulta a versão aberta", async () => {
    jest.mocked(datasetsClient.relatorio).mockResolvedValue({
      versao: {},
    } as never)
    const { result } = renderHook(() => useRelatorio("v1"), {
      wrapper: envolver,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(datasetsClient.relatorio).toHaveBeenCalledWith("v1")
  })
})

describe.each([
  ["usePublicar", usePublicar, "publicar", "Versão publicada."],
  ["useDespublicar", useDespublicar, "despublicar", "Versão despublicada."],
] as const)("%s", (_, usar, acao, mensagem) => {
  it("relê a lista de datasets e avisa quando dá certo", async () => {
    jest.mocked(datasetsClient[acao]).mockResolvedValue({} as never)
    const invalidar = jest.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => usar(), { wrapper: envolver })

    act(() => result.current.mutate("v1"))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(mensagem))
    expect(datasetsClient[acao]).toHaveBeenCalledWith("v1", expect.anything())
    expect(invalidar).toHaveBeenCalledWith({ queryKey: datasetsQueryKeys.all })
  })

  it("mostra a mensagem do servidor quando falha, sem reler a lista", async () => {
    jest
      .mocked(datasetsClient[acao])
      .mockRejectedValue(
        new ApiError("NAO_ENCONTRADO", "Recurso não encontrado.")
      )
    const invalidar = jest.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => usar(), { wrapper: envolver })

    act(() => result.current.mutate("v1"))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Recurso não encontrado.")
    )
    expect(invalidar).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })
})
