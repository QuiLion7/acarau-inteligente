import { NextRequest } from "next/server"

import { GET as statusAdmin } from "@/app/api/admin/status/route"
import { GET as statusAnalista } from "@/app/api/analista/status/route"
import { buscarConta } from "@/lib/auth/contas-demo"
import { lerAmbiente, type Ambiente } from "@/lib/config/ambiente"
import { NOME_COOKIE_SESSAO } from "@/lib/auth/nome-cookie-sessao"
import { criarSessao, encerrarSessao } from "@/lib/server/auth/sessao-servico"
import { obterBanco } from "@/lib/server/db/cliente"
import {
  criarAmbienteDeTeste,
  USUARIO_ADMIN,
  USUARIO_ANALISTA,
} from "@/test/ambiente-teste"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"

jest.mock("@/lib/server/db/cliente", () => ({
  ...jest.requireActual("@/lib/server/db/cliente"),
  obterBanco: jest.fn(),
}))
jest.mock("@/lib/config/ambiente", () => ({
  ...jest.requireActual("@/lib/config/ambiente"),
  lerAmbiente: jest.fn(),
}))

const banco = criarBancoDeTeste()
let ambiente: Ambiente
let escrita: jest.SpyInstance

async function tokenDe(usuario: string): Promise<string> {
  const conta = buscarConta(usuario, ambiente)
  if (!conta) throw new Error("conta de teste ausente")
  return (await criarSessao(conta, new Date())).token
}

function requisicao(rota: string, token?: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/${rota}/status`, {
    headers: token ? { cookie: `${NOME_COOKIE_SESSAO}=${token}` } : {},
  })
}

function eventosDeLog(): Record<string, unknown>[] {
  return escrita.mock.calls.map(([linha]) => JSON.parse(String(linha)))
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

describe.each([
  ["analista", statusAnalista],
  ["admin", statusAdmin],
])("GET /api/%s/status sem sessão", (rota, GET) => {
  it("responde 401 NAO_AUTENTICADO sem nenhum dado da sessão", async () => {
    const resposta = await GET(requisicao(rota))
    const corpo = await resposta.json()

    expect(resposta.status).toBe(401)
    expect(resposta.headers.get("Cache-Control")).toBe("no-store")
    expect(corpo).toEqual({
      code: "NAO_AUTENTICADO",
      message: "Entre para acessar esta área.",
      requestId: resposta.headers.get("x-request-id"),
    })
  })

  it("responde 401 com cookie de token desconhecido", async () => {
    const resposta = await GET(requisicao(rota, "token-inventado"))

    expect(resposta.status).toBe(401)
    expect(await resposta.json()).toMatchObject({ code: "NAO_AUTENTICADO" })
  })

  it("responde 401 depois de a sessão ser encerrada", async () => {
    const token = await tokenDe(USUARIO_ADMIN)
    await encerrarSessao(token, new Date())

    const resposta = await GET(requisicao(rota, token))

    expect(resposta.status).toBe(401)
  })

  it("registra auth.acesso_negado sem usuário nem token", async () => {
    await GET(requisicao(rota, "token-inventado"))

    const [evento] = eventosDeLog()
    expect(evento).toMatchObject({
      evento: "auth.acesso_negado",
      motivo: "nao-autenticado",
      rota: `/api/${rota}/status`,
    })
    expect(JSON.stringify(evento)).not.toContain("token-inventado")
  })
})

describe("GET /api/admin/status", () => {
  it("responde 403 SEM_PERMISSAO ao analista, sem dados da sessão", async () => {
    const token = await tokenDe(USUARIO_ANALISTA)

    const resposta = await statusAdmin(requisicao("admin", token))
    const corpo = await resposta.json()

    expect(resposta.status).toBe(403)
    expect(corpo).toEqual({
      code: "SEM_PERMISSAO",
      message: "Você não tem permissão para acessar esta área.",
      requestId: resposta.headers.get("x-request-id"),
    })
    expect(eventosDeLog()[0]).toMatchObject({
      evento: "auth.acesso_negado",
      motivo: "sem-permissao",
      usuario: USUARIO_ANALISTA,
    })
  })

  it("responde 200 com a identificação da sessão ao administrador", async () => {
    const token = await tokenDe(USUARIO_ADMIN)

    const resposta = await statusAdmin(requisicao("admin", token))

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      usuario: USUARIO_ADMIN,
      nome: "Administrador Demo",
      papel: "administrador",
    })
  })
})

describe("GET /api/analista/status", () => {
  it("responde 200 ao analista", async () => {
    const token = await tokenDe(USUARIO_ANALISTA)

    const resposta = await statusAnalista(requisicao("analista", token))

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      usuario: USUARIO_ANALISTA,
      nome: "Analista Demo",
      papel: "analista",
    })
  })

  it("responde 200 também ao administrador, que tem o papel do analista", async () => {
    const token = await tokenDe(USUARIO_ADMIN)

    const resposta = await statusAnalista(requisicao("analista", token))

    expect(resposta.status).toBe(200)
  })
})
