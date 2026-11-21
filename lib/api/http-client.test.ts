import { ApiError } from "@/lib/api/api-error"
import { requisitar } from "@/lib/api/http-client"

let fetchSimulado: jest.SpyInstance<
  ReturnType<typeof fetch>,
  Parameters<typeof fetch>
>

// `restoreMocks` desfaz o spy a cada teste; ele é recriado antes de cada um.
beforeEach(() => {
  fetchSimulado = jest.spyOn(globalThis, "fetch")
})

function responderJson(corpo: unknown, status: number): void {
  fetchSimulado.mockResolvedValue(Response.json(corpo, { status }))
}

async function capturarErro(chamada: Promise<unknown>): Promise<ApiError> {
  try {
    await chamada
  } catch (erro) {
    if (erro instanceof ApiError) return erro
    throw erro
  }
  throw new Error("a chamada não lançou")
}

describe("requisitar", () => {
  it("chama o caminho na mesma origem, com cookie, e devolve a resposta 2xx", async () => {
    fetchSimulado.mockResolvedValue(new Response(null, { status: 204 }))

    const resposta = await requisitar("/api/auth/sair", { metodo: "POST" })

    expect(resposta.status).toBe(204)
    expect(fetchSimulado).toHaveBeenCalledWith("/api/auth/sair", {
      method: "POST",
      credentials: "same-origin",
      headers: undefined,
      body: undefined,
    })
  })

  it("envia o corpo como JSON", async () => {
    fetchSimulado.mockResolvedValue(new Response(null, { status: 200 }))

    await requisitar("/api/x", { metodo: "POST", corpo: { a: 1 } })

    expect(fetchSimulado).toHaveBeenCalledWith(
      "/api/x",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
        body: '{"a":1}',
      })
    )
  })

  it("envia FormData como veio, sem Content-Type manual (o navegador define o boundary)", async () => {
    fetchSimulado.mockResolvedValue(new Response(null, { status: 201 }))
    const formulario = new FormData()
    formulario.append("dados", "{}")

    await requisitar("/api/importacoes", { metodo: "POST", corpo: formulario })

    const [, opcoes] = fetchSimulado.mock.calls[0] ?? []
    expect(opcoes?.body).toBe(formulario)
    expect(opcoes?.headers).toBeUndefined()
  })

  it("usa GET por padrão", async () => {
    fetchSimulado.mockResolvedValue(new Response(null, { status: 200 }))

    await requisitar("/api/saude")

    expect(fetchSimulado).toHaveBeenCalledWith(
      "/api/saude",
      expect.objectContaining({ method: "GET" })
    )
  })

  it("transforma o envelope de erro do servidor em ApiError com code, message e requestId", async () => {
    responderJson(
      {
        code: "LOGIN_BLOQUEADO",
        message: "Muitas tentativas. Tente novamente em 12 minutos.",
        details: { esperaMinutos: 12 },
        requestId: "6f1c2a9e-3b7d-4c11-9a0e-2d5b8f7c4e10",
      },
      429
    )

    const erro = await capturarErro(requisitar("/api/auth/entrar"))

    expect(erro).toMatchObject({
      code: "LOGIN_BLOQUEADO",
      message: "Muitas tentativas. Tente novamente em 12 minutos.",
      status: 429,
      details: { esperaMinutos: 12 },
      requestId: "6f1c2a9e-3b7d-4c11-9a0e-2d5b8f7c4e10",
    })
  })

  it("devolve um erro genérico em pt-BR quando o corpo de erro não segue o envelope", async () => {
    fetchSimulado.mockResolvedValue(
      new Response("<html>502 Bad Gateway</html>", { status: 502 })
    )

    const erro = await capturarErro(requisitar("/api/x"))

    expect(erro.code).toBe("RESPOSTA_INESPERADA")
    expect(erro.status).toBe(502)
    expect(erro.message).not.toContain("Bad Gateway")
  })

  it("devolve SEM_CONEXAO, guardando a causa, quando o fetch falha", async () => {
    const causa = new TypeError("Failed to fetch")
    fetchSimulado.mockRejectedValue(causa)

    const erro = await capturarErro(requisitar("/api/x"))

    expect(erro.code).toBe("SEM_CONEXAO")
    expect(erro.message).toContain("conexão")
    expect(erro.cause).toBe(causa)
  })
})
