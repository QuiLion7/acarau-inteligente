import { act, renderHook } from "@testing-library/react"

import { useFiltroPeriodo } from "@/hooks/use-filtro-periodo"

const replace = jest.fn()
const usePathname = jest.fn<string, []>()
const useSearchParams = jest.fn<URLSearchParams, []>()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => usePathname(),
  useSearchParams: () => useSearchParams(),
}))

const PERIODOS = ["2025", "2026"]

function usar(consulta: string, caminho = "/saude") {
  usePathname.mockReturnValue(caminho)
  useSearchParams.mockReturnValue(new URLSearchParams(consulta))
  return renderHook(() => useFiltroPeriodo(PERIODOS)).result
}

beforeEach(() => jest.clearAllMocks())

describe("useFiltroPeriodo", () => {
  it("lê o período da URL e o resolve contra os períodos do dataset", () => {
    expect(usar("").current.resolucao).toEqual({
      tipo: "padrao",
      periodo: "2026",
    })
    expect(usar("periodo=2025").current.resolucao).toEqual({
      tipo: "periodo",
      periodo: "2025",
    })
    expect(usar("periodo=1999").current.resolucao).toEqual({
      tipo: "sem-dados",
      valor: "1999",
    })
  })

  it("seleciona trocando só o período e preservando o bairro e a versão, sem rolar a página", () => {
    const resultado = usar("versao=abc&bairro=uv-10&periodo=2025")

    act(() => resultado.current.selecionar("2026"))

    expect(replace).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith(
      "/saude?versao=abc&bairro=uv-10&periodo=2026",
      { scroll: false }
    )
  })

  it("seleciona numa URL sem parâmetros", () => {
    const resultado = usar("")

    act(() => resultado.current.selecionar("2025"))

    expect(replace).toHaveBeenCalledWith("/saude?periodo=2025", {
      scroll: false,
    })
  })

  it("limpa tirando o período da URL e mantém os outros parâmetros", () => {
    const resultado = usar("periodo=1999&bairro=uv-10")

    act(() => resultado.current.limpar())

    expect(replace).toHaveBeenCalledWith("/saude?bairro=uv-10", {
      scroll: false,
    })
  })

  it("limpa até o caminho puro quando o período era o único parâmetro", () => {
    const resultado = usar("periodo=1999")

    act(() => resultado.current.limpar())

    expect(replace).toHaveBeenCalledWith("/saude", { scroll: false })
  })
})
