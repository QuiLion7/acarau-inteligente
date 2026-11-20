import { NextRequest } from "next/server"

import { proxy } from "@/proxy"

const UUID = "6f1c2a9e-3b7d-4c11-9a0e-2d5b8f7c4e10"

function requisicao(cabecalhos: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/saude", { headers: cabecalhos })
}

describe("proxy", () => {
  it("gera um x-request-id na resposta e o repassa à requisição seguinte", () => {
    const resposta = proxy(requisicao())

    const id = resposta.headers.get("x-request-id")
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(resposta.headers.get("x-middleware-request-x-request-id")).toBe(id)
  })

  it("propaga o x-request-id recebido quando é um UUID", () => {
    const resposta = proxy(requisicao({ "x-request-id": UUID }))

    expect(resposta.headers.get("x-request-id")).toBe(UUID)
  })

  it("troca um x-request-id que não é UUID", () => {
    const resposta = proxy(requisicao({ "x-request-id": "injetado" }))

    expect(resposta.headers.get("x-request-id")).not.toBe("injetado")
  })

  it("deixa passar as rotas públicas, com ou sem cookie", () => {
    const resposta = proxy(new NextRequest("http://localhost:3000/saude"))

    expect(resposta.status).toBe(200)
    expect(resposta.headers.get("location")).toBeNull()
  })
})

describe("proxy: áreas restritas", () => {
  it.each(["/analista", "/analista/relatorio", "/admin", "/admin/usuarios"])(
    "leva %s ao login com o motivo e o caminho de volta quando não há cookie de sessão",
    (caminho) => {
      const resposta = proxy(
        new NextRequest(`http://localhost:3000${caminho}?aba=1`)
      )

      expect(resposta.status).toBe(307)
      const destino = new URL(resposta.headers.get("location") ?? "")
      expect(destino.pathname).toBe("/entrar")
      expect(destino.searchParams.get("motivo")).toBe("restrito")
      expect(destino.searchParams.get("retorno")).toBe(`${caminho}?aba=1`)
      expect(resposta.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/)
    }
  )

  it("deixa passar quando há cookie de sessão, sem validar: quem decide é o servidor", () => {
    const resposta = proxy(
      new NextRequest("http://localhost:3000/analista", {
        headers: { cookie: "acarau_sessao=qualquer-valor" },
      })
    )

    expect(resposta.status).toBe(200)
    expect(resposta.headers.get("location")).toBeNull()
  })

  it.each(["/administracao", "/analistas", "/entrar", "/"])(
    "não trata %s como área restrita",
    (caminho) => {
      const resposta = proxy(new NextRequest(`http://localhost:3000${caminho}`))

      expect(resposta.headers.get("location")).toBeNull()
    }
  )
})
