import "server-only"

import type { NextRequest, NextResponse } from "next/server"

import { NOME_COOKIE_SESSAO } from "@/lib/auth/nome-cookie-sessao"

type OpcoesCookie = {
  httpOnly: true
  sameSite: "lax"
  path: "/"
  secure: boolean
  maxAge?: number
}

// HttpOnly, Lax e sem Max-Age: o cookie some com o navegador; a expiração real é por inatividade, no servidor
// (RF-00.30, seguranca.md §3). `Secure` só com https para o login também funcionar em http://localhost.
export function opcoesCookieSessao(appUrl: string): OpcoesCookie {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: new URL(appUrl).protocol === "https:",
  }
}

// Só este módulo conhece o nome do cookie (seguranca.md §3).
export function lerTokenDoRequest(request: NextRequest): string | undefined {
  return request.cookies.get(NOME_COOKIE_SESSAO)?.value
}

export function definirCookieSessao(
  resposta: NextResponse,
  token: string,
  appUrl: string
): void {
  resposta.cookies.set(NOME_COOKIE_SESSAO, token, opcoesCookieSessao(appUrl))
}

export function expirarCookieSessao(
  resposta: NextResponse,
  appUrl: string
): void {
  resposta.cookies.set(NOME_COOKIE_SESSAO, "", {
    ...opcoesCookieSessao(appUrl),
    maxAge: 0,
  })
}
