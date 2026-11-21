import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"

import { datasetsQueryKeys } from "@/hooks/query/use-datasets"
import {
  useConfirmarImportacao,
  useConteudoImportado,
} from "@/hooks/query/use-importacao"
import { importacaoClient } from "@/lib/api/importacao-client"
import type { ConfirmarImportacao } from "@/lib/validations/importacao-schema"

const push = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))
jest.mock("@/lib/api/importacao-client", () => ({
  importacaoClient: { conteudoImportado: jest.fn(), confirmar: jest.fn() },
}))

const DADOS: ConfirmarImportacao = {
  separador: ";",
  mapeamento: { bairro: 0, periodo: 1, casos: 2 },
  decisoes: [],
  metadados: { nome: "Roteiro", indicador: "Casos", fonte: "Planilha" },
  destino: { tipo: "novo" },
}

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

describe("useConteudoImportado", () => {
  it("sem hash não consulta o servidor", () => {
    renderHook(() => useConteudoImportado(null), { wrapper: envolver })

    expect(importacaoClient.conteudoImportado).not.toHaveBeenCalled()
  })

  it("com hash consulta e devolve a resposta", async () => {
    jest
      .mocked(importacaoClient.conteudoImportado)
      .mockResolvedValue({ importado: false })
    const { result } = renderHook(() => useConteudoImportado("abc"), {
      wrapper: envolver,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(importacaoClient.conteudoImportado).toHaveBeenCalledWith("abc")
    expect(result.current.data).toEqual({ importado: false })
  })
})

describe("useConfirmarImportacao", () => {
  it("relê os datasets e vai à Saúde com a versão gravada", async () => {
    jest
      .mocked(importacaoClient.confirmar)
      .mockResolvedValue({ datasetId: "d1", versaoId: "v 1", numero: 1 })
    const invalidar = jest.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useConfirmarImportacao(), {
      wrapper: envolver,
    })

    act(() =>
      result.current.mutate({
        arquivo: { nome: "a.csv", bytes: new Uint8Array() },
        dados: DADOS,
      })
    )

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/saude?versao=v%201")
    )
    expect(invalidar).toHaveBeenCalledWith({ queryKey: datasetsQueryKeys.all })
  })
})
