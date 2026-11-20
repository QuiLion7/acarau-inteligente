import { NextRequest, NextResponse } from "next/server"

import type { SessaoValida } from "@/lib/auth/papeis"
import { ErroApi } from "@/lib/server/http/erro-api"
import {
  criarRotaApi,
  type DependenciasRota,
  type ManipuladorRota,
} from "@/lib/server/http/rota-api"

const APP_URL = "http://localhost:3000"
const AGORA = new Date("2026-11-20T12:00:00.000Z")
const REQUEST_ID = "6f1c2a9e-3b7d-4c11-9a0e-2d5b8f7c4e10"

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

function montarRota(sessao: SessaoValida | null = null) {
  const dependencias: DependenciasRota = {
    agora: () => AGORA,
    appUrl: () => APP_URL,
    obterSessao: async () => sessao,
  }
  return criarRotaApi(dependencias)
}

function requisicao(
  metodo = "GET",
  cabecalhos: Record<string, string> = {}
): NextRequest {
  return new NextRequest(`${APP_URL}/api/teste`, {
    method: metodo,
    headers: cabecalhos,
  })
}

const respondeOk: ManipuladorRota = async () =>
  NextResponse.json({ ok: true }, { status: 200 })

function linhasDeLog(escrita: jest.SpyInstance): Record<string, unknown>[] {
  return escrita.mock.calls.map(([linha]) => JSON.parse(String(linha)))
}

let escrita: jest.SpyInstance

beforeEach(() => {
  escrita = jest.spyOn(process.stdout, "write").mockImplementation(() => true)
})

describe("rotaApi: resposta", () => {
  it("devolve a resposta do handler com no-store e o x-request-id recebido", async () => {
    const rota = montarRota()(respondeOk)

    const resposta = await rota(
      requisicao("GET", { "x-request-id": REQUEST_ID })
    )

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ ok: true })
    expect(resposta.headers.get("Cache-Control")).toBe("no-store")
    expect(resposta.headers.get("x-request-id")).toBe(REQUEST_ID)
  })

  it("gera um requestId novo quando o header não é um UUID", async () => {
    const rota = montarRota()(respondeOk)

    const resposta = await rota(
      requisicao("GET", { "x-request-id": "valor livre do cliente" })
    )

    expect(resposta.headers.get("x-request-id")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
    expect(resposta.headers.get("x-request-id")).not.toContain("livre")
  })

  it("entrega ao handler o requestId, o relógio injetado e sessão nula em rota pública", async () => {
    const manipulador = jest.fn<
      ReturnType<ManipuladorRota>,
      Parameters<ManipuladorRota>
    >(respondeOk)

    await montarRota(ANALISTA)(manipulador)(
      requisicao("GET", { "x-request-id": REQUEST_ID })
    )

    expect(manipulador.mock.calls[0][1]).toEqual({
      requestId: REQUEST_ID,
      sessao: null,
      agora: AGORA,
    })
  })
})

describe("rotaApi: exceção no handler", () => {
  it("converte exceção em 500 ERRO_INTERNO sem stack nem caminho, com o requestId do header", async () => {
    const rota = montarRota()(async () => {
      throw new Error("falha em /home/quilion/projeto/lib/x.ts")
    })

    const resposta = await rota(
      requisicao("GET", { "x-request-id": REQUEST_ID })
    )
    const texto = await resposta.text()

    expect(resposta.status).toBe(500)
    expect(JSON.parse(texto)).toEqual({
      code: "ERRO_INTERNO",
      message: "Ocorreu um erro inesperado. Tente novamente em instantes.",
      requestId: REQUEST_ID,
    })
    expect(texto).not.toMatch(/at |\/home|\.ts|falha em/)
  })

  it("loga http.erro uma vez, com o mesmo requestId e o stack só no log", async () => {
    const rota = montarRota()(async () => {
      throw new Error("falha interna")
    })

    await rota(requisicao("GET", { "x-request-id": REQUEST_ID }))

    const linhas = linhasDeLog(escrita)
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({
      evento: "http.erro",
      nivel: "error",
      requestId: REQUEST_ID,
      metodo: "GET",
      rota: "/api/teste",
      erro: { nome: "Error", mensagem: "falha interna" },
    })
    expect(JSON.stringify(linhas[0])).toContain("rota-api.test.ts")
  })

  it("devolve no envelope o ErroApi lançado pelo handler, sem logar como erro", async () => {
    const rota = montarRota()(async () => {
      throw new ErroApi("VALIDACAO", {
        details: { campos: { usuario: "Obrigatório" } },
      })
    })

    const resposta = await rota(
      requisicao("GET", { "x-request-id": REQUEST_ID })
    )

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toMatchObject({
      code: "VALIDACAO",
      details: { campos: { usuario: "Obrigatório" } },
      requestId: REQUEST_ID,
    })
    expect(escrita).not.toHaveBeenCalled()
  })
})

describe("rotaApi: escrita e origem", () => {
  it("recusa escrita de outra origem com 403 ORIGEM_INVALIDA sem chamar o handler", async () => {
    const manipulador = jest.fn(respondeOk)
    const rota = montarRota()(manipulador, { escrita: true })

    const resposta = await rota(
      requisicao("POST", { origin: "https://exemplo.com" })
    )

    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toMatchObject({ code: "ORIGEM_INVALIDA" })
    expect(manipulador).not.toHaveBeenCalled()
  })

  it("aceita escrita com a origem de APP_URL", async () => {
    const rota = montarRota()(respondeOk, { escrita: true })

    const resposta = await rota(requisicao("POST", { origin: APP_URL }))

    expect(resposta.status).toBe(200)
  })

  it("não confere a origem quando a rota não é de escrita", async () => {
    const rota = montarRota()(respondeOk)

    const resposta = await rota(
      requisicao("POST", { origin: "https://exemplo.com" })
    )

    expect(resposta.status).toBe(200)
  })
})

describe("rotaApi: papel mínimo", () => {
  it("devolve 401 NAO_AUTENTICADO sem dado de sessão quando não há sessão válida", async () => {
    const manipulador = jest.fn(respondeOk)
    const rota = montarRota(null)(manipulador, { papel: "analista" })

    const resposta = await rota(
      requisicao("GET", { "x-request-id": REQUEST_ID })
    )

    expect(resposta.status).toBe(401)
    expect(await resposta.json()).toEqual({
      code: "NAO_AUTENTICADO",
      message: "Entre para acessar esta área.",
      requestId: REQUEST_ID,
    })
    expect(manipulador).not.toHaveBeenCalled()
    expect(linhasDeLog(escrita)[0]).toMatchObject({
      evento: "auth.acesso_negado",
      motivo: "nao-autenticado",
      rota: "/api/teste",
      requestId: REQUEST_ID,
    })
  })

  it("devolve 403 SEM_PERMISSAO quando o papel está abaixo do mínimo e loga o usuário", async () => {
    const manipulador = jest.fn(respondeOk)
    const rota = montarRota(ANALISTA)(manipulador, { papel: "administrador" })

    const resposta = await rota(requisicao())

    expect(resposta.status).toBe(403)
    expect(await resposta.text()).not.toContain("analista")
    expect(manipulador).not.toHaveBeenCalled()
    expect(linhasDeLog(escrita)[0]).toMatchObject({
      evento: "auth.acesso_negado",
      motivo: "sem-permissao",
      usuario: "analista",
    })
  })

  it.each([
    ["analista", ANALISTA, "analista"],
    ["administrador", ADMINISTRADOR, "analista"],
    ["administrador", ADMINISTRADOR, "administrador"],
  ] as const)(
    "com papel %s e mínimo %s passa a sessão ao handler",
    async (_papel, sessao, minimo) => {
      const manipulador = jest.fn<
        ReturnType<ManipuladorRota>,
        Parameters<ManipuladorRota>
      >(respondeOk)
      const rota = montarRota(sessao)(manipulador, { papel: minimo })

      const resposta = await rota(requisicao())

      expect(resposta.status).toBe(200)
      expect(manipulador.mock.calls[0][1].sessao).toEqual(sessao)
    }
  )

  it("com a dependência padrão (validação de sessão ainda não ligada) nega o acesso restrito", async () => {
    const { rotaApi } = await import("@/lib/server/http/rota-api")
    const rota = rotaApi(respondeOk, { papel: "analista" })

    const resposta = await rota(requisicao())

    expect(resposta.status).toBe(401)
  })
})
