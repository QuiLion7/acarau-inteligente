import { NextRequest } from "next/server"

import { POST } from "@/app/api/auth/sair/route"
import { buscarConta } from "@/lib/auth/contas-demo"
import { lerAmbiente, type Ambiente } from "@/lib/config/ambiente"
import { NOME_COOKIE_SESSAO } from "@/lib/auth/nome-cookie-sessao"
import { criarSessao, validarSessao } from "@/lib/server/auth/sessao-servico"
import { obterBanco } from "@/lib/server/db/cliente"
import { criarAmbienteDeTeste, USUARIO_ANALISTA } from "@/test/ambiente-teste"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"

jest.mock("@/lib/server/db/cliente", () => ({
  ...jest.requireActual("@/lib/server/db/cliente"),
  obterBanco: jest.fn(),
}))
jest.mock("@/lib/config/ambiente", () => ({
  ...jest.requireActual("@/lib/config/ambiente"),
  lerAmbiente: jest.fn(),
}))

const ORIGEM = "http://localhost:3000"

const banco = criarBancoDeTeste()
let ambiente: Ambiente
let escrita: jest.SpyInstance

async function criarToken(): Promise<string> {
  const conta = buscarConta(USUARIO_ANALISTA, ambiente)
  if (!conta) throw new Error("conta de teste ausente")
  return (await criarSessao(conta, new Date())).token
}

function sair(token?: string, origem: string | null = ORIGEM) {
  const cabecalhos: Record<string, string> = {}
  if (origem) cabecalhos.origin = origem
  if (token) cabecalhos.cookie = `${NOME_COOKIE_SESSAO}=${token}`
  return POST(
    new NextRequest(`${ORIGEM}/api/auth/sair`, {
      method: "POST",
      headers: cabecalhos,
    })
  )
}

beforeAll(async () => {
  ambiente = await criarAmbienteDeTeste()
})

beforeEach(async () => {
  jest.mocked(obterBanco).mockReturnValue(banco)
  jest.mocked(lerAmbiente).mockReturnValue(ambiente)
  escrita = jest.spyOn(process.stdout, "write").mockImplementation(() => true)
  await limparTabelas(banco)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("POST /api/auth/sair", () => {
  it("responde 204, expira o cookie, invalida a sessão e registra auth.logout", async () => {
    const token = await criarToken()

    const resposta = await sair(token)

    expect(resposta.status).toBe(204)
    expect(resposta.headers.get("set-cookie")).toMatch(/Max-Age=0/i)
    expect(await validarSessao(token, new Date())).toBeNull()
    const [linha] = escrita.mock.calls.map(([texto]) =>
      JSON.parse(String(texto))
    )
    expect(linha).toMatchObject({
      evento: "auth.logout",
      usuario: USUARIO_ANALISTA,
    })
    expect(JSON.stringify(linha)).not.toContain(token)
  })

  it("responde 204 também sem sessão, sem registrar logout", async () => {
    const resposta = await sair()

    expect(resposta.status).toBe(204)
    expect(escrita).not.toHaveBeenCalled()
  })

  it("responde 403 ORIGEM_INVALIDA e mantém a sessão quando a origem é outra", async () => {
    const token = await criarToken()

    const resposta = await sair(token, "https://exemplo.com")

    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toMatchObject({ code: "ORIGEM_INVALIDA" })
    expect(await validarSessao(token, new Date())).not.toBeNull()
  })
})
