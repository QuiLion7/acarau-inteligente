import { NextRequest, NextResponse } from "next/server"

import { NOME_COOKIE_SESSAO } from "@/lib/auth/nome-cookie-sessao"
import {
  definirCookieSessao,
  expirarCookieSessao,
  lerTokenDoRequest,
  opcoesCookieSessao,
} from "@/lib/server/auth/cookie-sessao"

describe("opcoesCookieSessao", () => {
  it("é HttpOnly, SameSite=Lax, Path=/ e sem Max-Age", () => {
    const opcoes = opcoesCookieSessao("http://localhost:3000")

    expect(opcoes).toEqual({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
    })
    expect(opcoes).not.toHaveProperty("maxAge")
  })

  it("liga Secure só quando APP_URL é https", () => {
    expect(opcoesCookieSessao("https://acarau.exemplo.com").secure).toBe(true)
    expect(opcoesCookieSessao("http://localhost:3000").secure).toBe(false)
  })
})

describe("cookie na resposta", () => {
  it("grava o token com os atributos de segurança e sem Max-Age", () => {
    const resposta = NextResponse.json({})

    definirCookieSessao(resposta, "token-x", "https://acarau.exemplo.com")

    const cabecalho = resposta.headers.get("set-cookie") ?? ""
    expect(cabecalho).toContain(`${NOME_COOKIE_SESSAO}=token-x`)
    expect(cabecalho).toMatch(/HttpOnly/i)
    expect(cabecalho).toMatch(/SameSite=lax/i)
    expect(cabecalho).toMatch(/Path=\//i)
    expect(cabecalho).toMatch(/Secure/i)
    expect(cabecalho).not.toMatch(/Max-Age|Expires/i)
  })

  it("expira o cookie na saída com Max-Age=0", () => {
    const resposta = NextResponse.json({})

    expirarCookieSessao(resposta, "http://localhost:3000")

    const cabecalho = resposta.headers.get("set-cookie") ?? ""
    expect(cabecalho).toContain(`${NOME_COOKIE_SESSAO}=;`)
    expect(cabecalho).toMatch(/Max-Age=0/i)
    expect(cabecalho).toMatch(/HttpOnly/i)
  })
})

describe("lerTokenDoRequest", () => {
  it("lê o token do cookie do request", () => {
    const request = new NextRequest("http://localhost:3000/api/x", {
      headers: { cookie: `outro=1; ${NOME_COOKIE_SESSAO}=abc123` },
    })

    expect(lerTokenDoRequest(request)).toBe("abc123")
  })

  it("devolve undefined sem o cookie", () => {
    const request = new NextRequest("http://localhost:3000/api/x")

    expect(lerTokenDoRequest(request)).toBeUndefined()
  })
})
