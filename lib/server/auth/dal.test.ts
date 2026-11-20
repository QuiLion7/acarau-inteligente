import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import type { SessaoValida } from "@/lib/auth/papeis"
import { exigirPapelNaPagina, obterSessaoAtual } from "@/lib/server/auth/dal"
import { validarSessao } from "@/lib/server/auth/sessao-servico"

jest.mock("next/headers", () => ({ cookies: jest.fn() }))
jest.mock("next/navigation", () => ({ redirect: jest.fn() }))
jest.mock("@/lib/server/auth/sessao-servico", () => ({
  validarSessao: jest.fn(),
}))

const ANALISTA: SessaoValida = {
  usuario: "analista",
  nome: "Analista Demo",
  papel: "analista",
}
const ADMINISTRADOR: SessaoValida = {
  usuario: "admin",
  nome: "Administrador Demo",
  papel: "administrador",
}

// O redirect real lança para interromper o render; o double faz o mesmo.
class RedirecionamentoSimulado extends Error {}

function cookieDeSessao(valor: string | undefined) {
  jest.mocked(cookies).mockResolvedValue({
    get: (nome: string) =>
      nome === "acarau_sessao" && valor
        ? { name: nome, value: valor }
        : undefined,
  } as Awaited<ReturnType<typeof cookies>>)
}

beforeEach(() => {
  jest.mocked(redirect).mockImplementation(() => {
    throw new RedirecionamentoSimulado()
  })
})

describe("obterSessaoAtual", () => {
  it("valida o token do cookie com a hora atual e devolve a sessão", async () => {
    cookieDeSessao("token-x")
    jest.mocked(validarSessao).mockResolvedValue(ANALISTA)

    const sessao = await obterSessaoAtual()

    expect(sessao).toEqual(ANALISTA)
    expect(validarSessao).toHaveBeenCalledWith("token-x", expect.any(Date))
  })

  it("devolve null quando não há cookie ou a sessão é inválida", async () => {
    cookieDeSessao(undefined)
    jest.mocked(validarSessao).mockResolvedValue(null)

    expect(await obterSessaoAtual()).toBeNull()
    expect(validarSessao).toHaveBeenCalledWith(undefined, expect.any(Date))
  })
})

describe("exigirPapelNaPagina", () => {
  it("devolve ok com a sessão quando o papel basta", async () => {
    cookieDeSessao("token-x")
    jest.mocked(validarSessao).mockResolvedValue(ADMINISTRADOR)

    expect(await exigirPapelNaPagina("analista", "/analista")).toEqual({
      tipo: "ok",
      sessao: ADMINISTRADOR,
    })
    expect(redirect).not.toHaveBeenCalled()
  })

  it("devolve sem-permissao, sem redirecionar, quando o papel é menor que o mínimo", async () => {
    cookieDeSessao("token-x")
    jest.mocked(validarSessao).mockResolvedValue(ANALISTA)

    expect(await exigirPapelNaPagina("administrador", "/admin")).toEqual({
      tipo: "sem-permissao",
    })
    expect(redirect).not.toHaveBeenCalled()
  })

  it("redireciona ao login com o caminho codificado quando a sessão é inválida ou expirou", async () => {
    cookieDeSessao("token-vencido")
    jest.mocked(validarSessao).mockResolvedValue(null)

    await expect(
      exigirPapelNaPagina("analista", "/analista?aba=a b")
    ).rejects.toThrow(RedirecionamentoSimulado)

    expect(redirect).toHaveBeenCalledWith(
      "/entrar?motivo=expirada&retorno=%2Fanalista%3Faba%3Da%20b"
    )
  })
})
