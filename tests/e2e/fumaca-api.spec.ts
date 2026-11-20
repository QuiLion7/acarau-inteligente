import { expect, test } from "./fixtures"

test.describe("fumaça da API", () => {
  test("/api/saude responde 200 com o banco ok, sem cache e com x-request-id", async ({
    request,
  }) => {
    const resposta = await request.get("/api/saude")

    expect(resposta.status()).toBe(200)
    expect(resposta.headers()["cache-control"]).toBe("no-store")
    expect(resposta.headers()["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/)
    expect(await resposta.json()).toEqual({
      status: "ok",
      componentes: { aplicacao: "ok", banco: "ok" },
    })
  })

  test("uma rota de API inexistente responde 404 no envelope de erro", async ({
    request,
  }) => {
    const resposta = await request.get("/api/qualquer-coisa")

    expect(resposta.status()).toBe(404)
    expect(await resposta.json()).toMatchObject({
      code: "NAO_ENCONTRADO",
      requestId: resposta.headers()["x-request-id"],
    })
  })
})
