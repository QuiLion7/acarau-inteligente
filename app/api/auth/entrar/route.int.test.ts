import { NextRequest } from "next/server"

import { POST } from "@/app/api/auth/entrar/route"
import { lerAmbiente, type Ambiente } from "@/lib/config/ambiente"
import { NOME_COOKIE_SESSAO } from "@/lib/auth/nome-cookie-sessao"
import { validarSessao } from "@/lib/server/auth/sessao-servico"
import { obterBanco } from "@/lib/server/db/cliente"
import { sessao, tentativaLogin } from "@/lib/server/db/schema"
import {
  criarAmbienteDeTeste,
  SENHA_ANALISTA,
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

const ORIGEM = "http://localhost:3000"
const REQUEST_ID = "6f1c2a9e-3b7d-4c11-9a0e-2d5b8f7c4e10"
const SENHA_ERRADA = "senha-errada-xyz"

const banco = criarBancoDeTeste()
let ambiente: Ambiente
let escrita: jest.SpyInstance

function entrar(corpo: unknown, cabecalhos: Record<string, string> = {}) {
  return POST(
    new NextRequest(`${ORIGEM}/api/auth/entrar`, {
      method: "POST",
      headers: {
        origin: ORIGEM,
        "content-type": "application/json",
        "x-request-id": REQUEST_ID,
        ...cabecalhos,
      },
      body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
    })
  )
}

// O valor do cookie de sessão que a resposta manda gravar, ou undefined se ela não grava nenhum.
function tokenDaResposta(resposta: Response): string | undefined {
  for (const cabecalho of resposta.headers.getSetCookie()) {
    const [nomeEValor] = cabecalho.split(";")
    const [nome, valor] = nomeEValor.split("=")
    if (nome === NOME_COOKIE_SESSAO && valor) return valor
  }
  return undefined
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

describe("POST /api/auth/entrar", () => {
  it("responde 200 com a identificação e um cookie de sessão HttpOnly que o servidor aceita", async () => {
    const resposta = await entrar({
      usuario: USUARIO_ANALISTA,
      senha: SENHA_ANALISTA,
    })

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      usuario: USUARIO_ANALISTA,
      nome: "Analista Demo",
      papel: "analista",
    })
    const token = tokenDaResposta(resposta)
    expect(token).toBeTruthy()
    expect(resposta.headers.get("set-cookie")).toMatch(/HttpOnly/i)
    expect(await validarSessao(token, new Date())).toMatchObject({
      usuario: USUARIO_ANALISTA,
    })
  })

  it("responde 401 com a mesma mensagem para usuário inexistente e senha errada", async () => {
    const inexistente = await entrar({
      usuario: "ninguem",
      senha: SENHA_ERRADA,
    })
    const senhaErrada = await entrar({
      usuario: USUARIO_ANALISTA,
      senha: SENHA_ERRADA,
    })

    expect(inexistente.status).toBe(401)
    expect(senhaErrada.status).toBe(401)
    expect(await inexistente.json()).toEqual(await senhaErrada.json())
    expect(tokenDaResposta(senhaErrada)).toBeUndefined()
  })

  it("responde 400 VALIDACAO com a mensagem por campo, sem eco do valor enviado", async () => {
    const resposta = await entrar({ usuario: "   ", senha: "" })
    const texto = await resposta.text()

    expect(resposta.status).toBe(400)
    expect(JSON.parse(texto)).toMatchObject({
      code: "VALIDACAO",
      details: {
        campos: { usuario: "Informe o usuário.", senha: "Informe a senha." },
      },
    })
  })

  it("responde 400 quando o corpo não é JSON", async () => {
    const resposta = await entrar("isto não é json")

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toMatchObject({
      code: "VALIDACAO",
      details: { campos: { corpo: expect.any(String) } },
    })
  })

  it("responde 429 com Retry-After a partir da quinta falha, mesmo com a senha certa", async () => {
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      await entrar({ usuario: USUARIO_ANALISTA, senha: SENHA_ERRADA })
    }

    const resposta = await entrar({
      usuario: USUARIO_ANALISTA,
      senha: SENHA_ANALISTA,
    })
    const corpo = await resposta.json()

    expect(resposta.status).toBe(429)
    expect(corpo).toMatchObject({
      code: "LOGIN_BLOQUEADO",
      message: "Muitas tentativas. Tente novamente em 15 minutos.",
      details: { esperaMinutos: 15 },
      requestId: REQUEST_ID,
    })
    expect(resposta.headers.get("Retry-After")).toBe("900")
    expect(tokenDaResposta(resposta)).toBeUndefined()
    expect(await banco.select().from(sessao)).toHaveLength(0)
  })

  it("responde 403 ORIGEM_INVALIDA para outra origem, sem registrar tentativa nem verificar a senha", async () => {
    const resposta = await entrar(
      { usuario: USUARIO_ANALISTA, senha: SENHA_ANALISTA },
      { origin: "https://exemplo.com" }
    )

    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toMatchObject({ code: "ORIGEM_INVALIDA" })
    expect(await banco.select().from(tentativaLogin)).toHaveLength(0)
    expect(await banco.select().from(sessao)).toHaveLength(0)
  })

  it("responde 403 quando o Origin está ausente", async () => {
    const resposta = await POST(
      new NextRequest(`${ORIGEM}/api/auth/entrar`, {
        method: "POST",
        body: JSON.stringify({
          usuario: USUARIO_ANALISTA,
          senha: SENHA_ANALISTA,
        }),
      })
    )

    expect(resposta.status).toBe(403)
    expect(await banco.select().from(tentativaLogin)).toHaveLength(0)
  })
})

describe("logs de login", () => {
  it("emite sucesso, falha e bloqueio com usuário, ts e requestId, sem senha, hash nem token", async () => {
    await entrar({ usuario: USUARIO_ANALISTA, senha: SENHA_ERRADA })
    const sucesso = await entrar({
      usuario: USUARIO_ANALISTA,
      senha: SENHA_ANALISTA,
    })
    const token = tokenDaResposta(sucesso) ?? ""
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      await entrar({ usuario: "outro-usuario", senha: SENHA_ERRADA })
    }
    await entrar({ usuario: "outro-usuario", senha: SENHA_ERRADA })

    const linhas = eventosDeLog()
    const porEvento = (nome: string) =>
      linhas.filter((linha) => linha.evento === nome)
    expect(porEvento("auth.login_falha")).toHaveLength(6)
    expect(porEvento("auth.login_sucesso")).toHaveLength(1)
    expect(porEvento("auth.login_bloqueado")).toHaveLength(1)
    expect(porEvento("auth.login_sucesso")[0]).toMatchObject({
      nivel: "info",
      usuario: USUARIO_ANALISTA,
      requestId: REQUEST_ID,
      ts: expect.any(String),
    })
    expect(porEvento("auth.login_falha")[0]).toMatchObject({ nivel: "warn" })
    expect(porEvento("auth.login_bloqueado")[0]).toMatchObject({
      nivel: "warn",
      usuario: "outro-usuario",
      requestId: REQUEST_ID,
    })

    const tudo = linhas.map((linha) => JSON.stringify(linha)).join("\n")
    expect(tudo).not.toContain(SENHA_ANALISTA)
    expect(tudo).not.toContain(SENHA_ERRADA)
    expect(tudo).not.toContain(ambiente.DEMO_ANALISTA_SENHA_HASH)
    expect(tudo).not.toContain(token)
  })
})
