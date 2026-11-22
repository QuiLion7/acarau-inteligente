import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { toast } from "sonner"

import { useSalvarObra } from "@/hooks/query/use-obras"
import { ApiError } from "@/lib/api/api-error"
import { obrasClient } from "@/lib/api/obras-client"
import { montarObra } from "@/lib/obras/__fixtures__/obra"
import { obraEntradaSchema } from "@/lib/validations/obra-schema"

const refresh = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/lib/api/obras-client", () => ({
  obrasClient: { criar: jest.fn(), editar: jest.fn() },
}))

let queryClient: QueryClient

function envolver({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const ENTRADA = obraEntradaSchema.parse({
  titulo: "DEMO - Praça",
  situacao: "planejada",
})
const OBRA = montarObra()

beforeEach(() => {
  jest.clearAllMocks()
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
})

describe("useSalvarObra", () => {
  it("sem id cria a obra, relê as páginas do servidor e avisa que foi salva", async () => {
    jest.mocked(obrasClient.criar).mockResolvedValue(OBRA)
    const { result } = renderHook(() => useSalvarObra(), { wrapper: envolver })

    act(() => result.current.mutate({ obraId: null, entrada: ENTRADA }))

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Obra salva")
    )
    expect(obrasClient.criar).toHaveBeenCalledWith(ENTRADA)
    expect(obrasClient.editar).not.toHaveBeenCalled()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("com id edita a obra", async () => {
    jest.mocked(obrasClient.editar).mockResolvedValue(OBRA)
    const { result } = renderHook(() => useSalvarObra(), { wrapper: envolver })

    act(() => result.current.mutate({ obraId: OBRA.id, entrada: ENTRADA }))

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    expect(obrasClient.editar).toHaveBeenCalledWith(OBRA.id, ENTRADA)
    expect(obrasClient.criar).not.toHaveBeenCalled()
  })

  it("entrega a obra salva a quem pediu, para a tela selecioná-la", async () => {
    jest.mocked(obrasClient.criar).mockResolvedValue(OBRA)
    const aoSalvar = jest.fn()
    const { result } = renderHook(() => useSalvarObra(), { wrapper: envolver })

    act(() =>
      result.current.mutate(
        { obraId: null, entrada: ENTRADA },
        { onSuccess: aoSalvar }
      )
    )

    await waitFor(() => expect(aoSalvar).toHaveBeenCalled())
    expect(aoSalvar.mock.calls[0]![0]).toEqual(OBRA)
  })

  it("com erro guarda o erro na mutation e não relê nada nem avisa de sucesso", async () => {
    const erro = new ApiError("VALIDACAO", "Os dados enviados são inválidos.", {
      status: 400,
    })
    jest.mocked(obrasClient.criar).mockRejectedValue(erro)
    const { result } = renderHook(() => useSalvarObra(), { wrapper: envolver })

    act(() => result.current.mutate({ obraId: null, entrada: ENTRADA }))

    await waitFor(() => expect(result.current.error).toBe(erro))
    expect(refresh).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })
})
