import { act, renderHook } from "@testing-library/react"

import { useParametroNovaObra } from "@/hooks/use-parametro-nova-obra"

const replace = jest.fn()
const useSearchParams = jest.fn<URLSearchParams, []>()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/obras",
  useSearchParams: () => useSearchParams(),
}))

function usar(consulta: string) {
  useSearchParams.mockReturnValue(new URLSearchParams(consulta))
  return renderHook(() => useParametroNovaObra()).result
}

beforeEach(() => jest.clearAllMocks())

describe("useParametroNovaObra (CA-04.22)", () => {
  it("tira o nova e preserva os filtros", () => {
    const resultado = usar("nova=1&bairro=uv-10&situacao=suspensa")

    act(() => resultado.current.remover())

    expect(replace).toHaveBeenCalledWith(
      "/obras?bairro=uv-10&situacao=suspensa",
      {
        scroll: false,
      }
    )
  })

  it("com só o nova volta ao caminho puro", () => {
    const resultado = usar("nova=1")

    act(() => resultado.current.remover())

    expect(replace).toHaveBeenCalledWith("/obras", { scroll: false })
  })

  it("sem o nova na URL não troca a URL (nada a limpar)", () => {
    const resultado = usar("bairro=uv-10")

    act(() => resultado.current.remover())

    expect(replace).not.toHaveBeenCalled()
  })
})
