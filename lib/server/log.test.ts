import { log } from "@/lib/server/log"

const AGORA = new Date("2026-11-20T12:00:00.000Z")

function linhasEscritas(escrita: jest.SpyInstance): Record<string, unknown>[] {
  return escrita.mock.calls.map(([linha]) => JSON.parse(String(linha)))
}

describe("log", () => {
  let escrita: jest.SpyInstance
  const nivelOriginal = process.env.LOG_NIVEL

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(AGORA)
    escrita = jest.spyOn(process.stdout, "write").mockImplementation(() => true)
    delete process.env.LOG_NIVEL
  })

  afterEach(() => {
    jest.useRealTimers()
    if (nivelOriginal === undefined) delete process.env.LOG_NIVEL
    else process.env.LOG_NIVEL = nivelOriginal
  })

  it("escreve uma linha JSON com ts, nivel, evento e os campos", () => {
    log.info("auth.login_sucesso", { requestId: "r-1", usuario: "analista" })

    expect(escrita).toHaveBeenCalledTimes(1)
    const [bruta] = escrita.mock.calls[0]
    expect(String(bruta).endsWith("\n")).toBe(true)
    expect(String(bruta).trim().split("\n")).toHaveLength(1)
    expect(linhasEscritas(escrita)[0]).toEqual({
      ts: "2026-11-20T12:00:00.000Z",
      nivel: "info",
      evento: "auth.login_sucesso",
      requestId: "r-1",
      usuario: "analista",
    })
  })

  // TU-10
  it.each(["debug", "info", "warn", "error"] as const)(
    "redige chaves sensíveis em qualquer nível do objeto (%s)",
    (nivel) => {
      process.env.LOG_NIVEL = "debug"

      log[nivel]("teste.redacao", {
        senha: "s1",
        Token: "t1",
        cookie: "c1",
        senhaHash: "h1",
        token_hash: "h2",
        Authorization: "Bearer a1",
        aninhado: { profundo: [{ authorization: "a2", visivel: "ok" }] },
        usuario: "analista",
      })

      const [linha] = linhasEscritas(escrita)
      expect(linha).toMatchObject({
        senha: "[redigido]",
        Token: "[redigido]",
        cookie: "[redigido]",
        senhaHash: "[redigido]",
        token_hash: "[redigido]",
        Authorization: "[redigido]",
        aninhado: {
          profundo: [{ authorization: "[redigido]", visivel: "ok" }],
        },
        usuario: "analista",
      })
      expect(JSON.stringify(linha)).not.toMatch(/s1|t1|c1|h1|h2|a1|a2/)
    }
  )

  it("redige as chaves sensíveis também dentro do erro registrado, mantendo stack e causa", () => {
    const erro = new Error("falhou", {
      cause: { token: "t-da-causa", motivo: "rede" },
    })

    log.error("http.erro", { erro })

    const [linha] = linhasEscritas(escrita)
    expect(linha.erro).toMatchObject({
      nome: "Error",
      mensagem: "falhou",
      causa: { token: "[redigido]", motivo: "rede" },
    })
    expect(String((linha.erro as { stack: string }).stack)).toContain("falhou")
  })

  it("não deixa o chamador sobrescrever ts, nivel e evento", () => {
    log.warn("auth.login_falha", {
      ts: "falso",
      nivel: "debug",
      evento: "outro",
    })

    expect(linhasEscritas(escrita)[0]).toEqual({
      ts: "2026-11-20T12:00:00.000Z",
      nivel: "warn",
      evento: "auth.login_falha",
    })
  })

  it("não altera o objeto recebido", () => {
    const campos = { senha: "s1", ts: "falso" }

    log.info("teste.copia", campos)

    expect(campos).toEqual({ senha: "s1", ts: "falso" })
  })

  it("aguenta referência circular e bigint sem lançar", () => {
    const circular: Record<string, unknown> = { nome: "a" }
    circular.eu = circular

    log.info("teste.circular", { circular, grande: BigInt(10) })

    expect(linhasEscritas(escrita)[0]).toMatchObject({
      circular: { nome: "a", eu: "[circular]" },
      grande: "10",
    })
  })

  it("respeita LOG_NIVEL: abaixo do mínimo não escreve; padrão é info", () => {
    log.debug("teste.debug")
    expect(escrita).not.toHaveBeenCalled()

    process.env.LOG_NIVEL = "error"
    log.warn("teste.warn")
    expect(escrita).not.toHaveBeenCalled()
    log.error("teste.error")
    expect(escrita).toHaveBeenCalledTimes(1)

    process.env.LOG_NIVEL = "inexistente"
    log.info("teste.info")
    expect(escrita).toHaveBeenCalledTimes(2)
  })

  it("mantém o log de debug quando LOG_NIVEL=debug", () => {
    process.env.LOG_NIVEL = "debug"

    log.debug("teste.debug")

    expect(linhasEscritas(escrita)[0]).toMatchObject({
      nivel: "debug",
      evento: "teste.debug",
    })
  })
})
