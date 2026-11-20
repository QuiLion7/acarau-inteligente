import { act, renderHook } from "@testing-library/react"

import { useFiltroBairro } from "@/hooks/use-filtro-bairro"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"

const replace = jest.fn()
const usePathname = jest.fn<string, []>()
const useSearchParams = jest.fn<URLSearchParams, []>()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => usePathname(),
  useSearchParams: () => useSearchParams(),
}))

const BAIRROS: BairroResumo[] = [
  { id: "uv-03", uv: 3, nome: "São Benedito", nomeLei: "SÃO BENEDITO" },
  { id: "uv-10", uv: 10, nome: "Centro", nomeLei: "CENTRO" },
]

function usar(consulta: string, caminho = "/territorio") {
  usePathname.mockReturnValue(caminho)
  useSearchParams.mockReturnValue(new URLSearchParams(consulta))
  return renderHook(() => useFiltroBairro(BAIRROS)).result
}

describe("useFiltroBairro", () => {
  it("lê o bairro da URL e o resolve contra a lista recebida", () => {
    expect(usar("bairro=uv-10").current.selecao).toEqual({
      tipo: "bairro",
      bairro: BAIRROS[1],
    })
    expect(usar("").current.selecao).toEqual({ tipo: "todos" })
    expect(usar("bairro=Centro").current.selecao).toEqual({
      tipo: "nao-reconhecido",
    })
  })

  it("seleciona trocando só o bairro da URL, preservando o período, sem rolar a página", () => {
    const resultado = usar("periodo=2025&bairro=uv-03")

    act(() => resultado.current.selecionar("uv-10"))

    expect(replace).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith(
      "/territorio?periodo=2025&bairro=uv-10",
      { scroll: false }
    )
  })

  it("seleciona numa URL sem parâmetros", () => {
    const resultado = usar("")

    act(() => resultado.current.selecionar("uv-03"))

    expect(replace).toHaveBeenCalledWith("/territorio?bairro=uv-03", {
      scroll: false,
    })
  })

  it("limpa tirando o bairro da URL e mantém os outros parâmetros", () => {
    const resultado = usar("pagina=2&bairro=uv-10&periodo=2025")

    act(() => resultado.current.limpar())

    expect(replace).toHaveBeenCalledWith("/territorio?pagina=2&periodo=2025", {
      scroll: false,
    })
  })

  it("limpa até o caminho puro quando o bairro era o único parâmetro", () => {
    const resultado = usar("bairro=uv-10")

    act(() => resultado.current.limpar())

    expect(replace).toHaveBeenCalledWith("/territorio", { scroll: false })
  })
})
