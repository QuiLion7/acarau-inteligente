import { NextRequest } from "next/server"

import {
  DELETE,
  GET,
  OPTIONS,
  PATCH,
  POST,
  PUT,
} from "@/app/api/[...rota]/route"

const REQUEST_ID = "6f1c2a9e-3b7d-4c11-9a0e-2d5b8f7c4e10"

describe("/api/[...rota]", () => {
  it("responde 404 NAO_ENCONTRADO no envelope para uma rota de API inexistente", async () => {
    const resposta = await GET(
      new NextRequest("http://localhost:3000/api/qualquer-coisa", {
        headers: { "x-request-id": REQUEST_ID },
      })
    )

    expect(resposta.status).toBe(404)
    expect(resposta.headers.get("Cache-Control")).toBe("no-store")
    expect(resposta.headers.get("x-request-id")).toBe(REQUEST_ID)
    expect(await resposta.json()).toEqual({
      code: "NAO_ENCONTRADO",
      message: "Recurso não encontrado.",
      requestId: REQUEST_ID,
    })
  })

  it.each([
    ["POST", POST],
    ["PUT", PUT],
    ["PATCH", PATCH],
    ["DELETE", DELETE],
    ["OPTIONS", OPTIONS],
  ])("responde 404 no envelope também para %s", async (metodo, manipulador) => {
    const resposta = await manipulador(
      new NextRequest("http://localhost:3000/api/a/b/c", { method: metodo })
    )

    expect(resposta.status).toBe(404)
    expect(await resposta.json()).toMatchObject({ code: "NAO_ENCONTRADO" })
  })
})
