import { NextResponse, type NextRequest } from "next/server"

import { NOME_COOKIE_SESSAO } from "@/lib/auth/nome-cookie-sessao"
import { HEADER_REQUEST_ID } from "@/lib/server/http/erro-api"
import { obterRequestId } from "@/lib/server/http/request-id"

const AREAS_RESTRITAS = ["/analista", "/admin"]

function ehAreaRestrita(caminho: string): boolean {
  return AREAS_RESTRITAS.some(
    (area) => caminho === area || caminho.startsWith(`${area}/`)
  )
}

// Só checagem otimista (RF-00.28): sem cookie de sessão numa área restrita vai ao login, com o caminho pedido
// para voltar depois. Se o cookie existe mas é inválido, quem recusa é o servidor (DAL), nunca o proxy
// (seguranca.md §1). Também gera/propaga o id da requisição.
export function proxy(request: NextRequest) {
  const requestId = obterRequestId(request.headers)
  const { pathname, search } = request.nextUrl

  if (ehAreaRestrita(pathname) && !request.cookies.has(NOME_COOKIE_SESSAO)) {
    const login = new URL("/entrar", request.url)
    login.searchParams.set("motivo", "restrito")
    login.searchParams.set("retorno", `${pathname}${search}`)
    const redirecionamento = NextResponse.redirect(login)
    redirecionamento.headers.set(HEADER_REQUEST_ID, requestId)
    return redirecionamento
  }

  const cabecalhosDaRequisicao = new Headers(request.headers)
  cabecalhosDaRequisicao.set(HEADER_REQUEST_ID, requestId)
  const resposta = NextResponse.next({
    request: { headers: cabecalhosDaRequisicao },
  })
  resposta.headers.set(HEADER_REQUEST_ID, requestId)
  return resposta
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
