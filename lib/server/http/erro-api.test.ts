import { ErroApi, respostaDeErro } from "@/lib/server/http/erro-api"

const REQUEST_ID = "6f1c2a9e-3b7d-4c11-9a0e-2d5b8f7c4e10"

describe("respostaDeErro", () => {
  it("monta o envelope com código, mensagem, details e requestId, com o status do catálogo", async () => {
    const erro = new ErroApi("LOGIN_BLOQUEADO", {
      message: "Muitas tentativas. Tente novamente em 12 minutos.",
      details: { esperaMinutos: 12 },
    })

    const resposta = respostaDeErro(erro, REQUEST_ID, { "Retry-After": "720" })

    expect(resposta.status).toBe(429)
    expect(resposta.headers.get("Retry-After")).toBe("720")
    expect(await resposta.json()).toEqual({
      code: "LOGIN_BLOQUEADO",
      message: "Muitas tentativas. Tente novamente em 12 minutos.",
      details: { esperaMinutos: 12 },
      requestId: REQUEST_ID,
    })
  })

  it("usa a mensagem padrão em pt-BR e omite details quando não há", async () => {
    const resposta = respostaDeErro(new ErroApi("NAO_AUTENTICADO"), REQUEST_ID)

    expect(resposta.status).toBe(401)
    expect(await resposta.json()).toEqual({
      code: "NAO_AUTENTICADO",
      message: "Entre para acessar esta área.",
      requestId: REQUEST_ID,
    })
  })

  it.each([
    ["VALIDACAO", 400],
    ["CREDENCIAIS_INVALIDAS", 401],
    ["NAO_AUTENTICADO", 401],
    ["SEM_PERMISSAO", 403],
    ["ORIGEM_INVALIDA", 403],
    ["NAO_ENCONTRADO", 404],
    ["LOGIN_BLOQUEADO", 429],
    ["ERRO_INTERNO", 500],
    ["SERVICO_INDISPONIVEL", 503],
  ] as const)("o código %s responde com status %s", (code, status) => {
    expect(new ErroApi(code).status).toBe(status)
  })
})
