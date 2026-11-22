import { act, renderHook } from "@testing-library/react"

import { useFiltroBairro } from "@/hooks/use-filtro-bairro"
import { useFiltroSituacao } from "@/hooks/use-filtro-situacao"

const replace = jest.fn()
const usePathname = jest.fn<string, []>()
const useSearchParams = jest.fn<URLSearchParams, []>()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => usePathname(),
  useSearchParams: () => useSearchParams(),
}))

function usar(consulta: string) {
  usePathname.mockReturnValue("/obras")
  useSearchParams.mockReturnValue(new URLSearchParams(consulta))
  return renderHook(() => useFiltroSituacao()).result
}

beforeEach(() => jest.clearAllMocks())

describe("useFiltroSituacao (TU-15, CA-04.14)", () => {
  it("lê as situações da URL, ignorando as inválidas e as repetidas", () => {
    expect(usar("").current.situacoes).toEqual([])
    expect(
      usar("situacao=suspensa,em_andamento,invalida,suspensa").current.situacoes
    ).toEqual(["em_andamento", "suspensa"])
  })

  it("escreve situacao=em_andamento,suspensa e preserva o bairro, sem rolar a página", () => {
    const resultado = usar("bairro=uv-10")

    act(() => resultado.current.definir(["suspensa", "em_andamento"]))

    expect(replace).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith(
      "/obras?bairro=uv-10&situacao=em_andamento%2Csuspensa",
      { scroll: false }
    )
  })

  it("trocar o bairro preserva a situação (o parâmetro local não se perde)", () => {
    usePathname.mockReturnValue("/obras")
    useSearchParams.mockReturnValue(
      new URLSearchParams("situacao=em_andamento,suspensa")
    )
    const { result } = renderHook(() => useFiltroBairro([]))

    act(() => result.current.selecionar("uv-10"))

    const [destino] = replace.mock.calls[0] as [string]
    expect(new URL(destino, "http://x").searchParams.get("situacao")).toBe(
      "em_andamento,suspensa"
    )
    expect(new URL(destino, "http://x").searchParams.get("bairro")).toBe(
      "uv-10"
    )
  })

  it("nenhuma situação marcada tira o parâmetro e mantém o resto da consulta", () => {
    const resultado = usar("bairro=uv-10&situacao=suspensa")

    act(() => resultado.current.definir([]))

    expect(replace).toHaveBeenCalledWith("/obras?bairro=uv-10", {
      scroll: false,
    })
  })

  it("desmarcar a única situação volta ao caminho puro", () => {
    const resultado = usar("situacao=suspensa")

    act(() => resultado.current.definir([]))

    expect(replace).toHaveBeenCalledWith("/obras", { scroll: false })
  })

  it("limparComBairro tira situação e bairro numa troca só e preserva o período", () => {
    const resultado = usar("situacao=suspensa&bairro=uv-10&periodo=2025")

    act(() => resultado.current.limparComBairro())

    expect(replace).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith("/obras?periodo=2025", {
      scroll: false,
    })
  })

  it("limparComBairro numa URL sem filtros volta ao caminho puro", () => {
    const resultado = usar("")

    act(() => resultado.current.limparComBairro())

    expect(replace).toHaveBeenCalledWith("/obras", { scroll: false })
  })
})
