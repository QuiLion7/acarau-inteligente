import { NextRequest } from "next/server"

import { GET } from "@/app/api/saude/route"
import { criarBanco, obterBanco } from "@/lib/server/db/cliente"
import { criarBancoDeTeste } from "@/test/banco-teste"

jest.mock("@/lib/server/db/cliente", () => ({
  ...jest.requireActual("@/lib/server/db/cliente"),
  obterBanco: jest.fn(),
}))

const obterBancoSimulado = jest.mocked(obterBanco)
const bancoDeTeste = criarBancoDeTeste()
const bancoSemServidor = criarBanco("postgres://u:s@localhost:1/b")

function requisicao(): NextRequest {
  return new NextRequest("http://localhost:3000/api/saude")
}

beforeEach(() => {
  jest.spyOn(process.stdout, "write").mockImplementation(() => true)
})

afterAll(async () => {
  await bancoDeTeste.$client.end()
  await bancoSemServidor.$client.end()
})

describe("GET /api/saude", () => {
  it("responde 200 com o estado ok, sem cache e com x-request-id, quando o banco responde", async () => {
    obterBancoSimulado.mockReturnValue(bancoDeTeste)

    const resposta = await GET(requisicao())

    expect(resposta.status).toBe(200)
    expect(resposta.headers.get("Cache-Control")).toBe("no-store")
    expect(resposta.headers.get("x-request-id")).toBeTruthy()
    expect(await resposta.json()).toEqual({
      status: "ok",
      componentes: { aplicacao: "ok", banco: "ok" },
    })
  })

  it("responde 503 com o estado indisponivel, sem detalhe do driver, quando o banco está fora", async () => {
    obterBancoSimulado.mockReturnValue(bancoSemServidor)

    const resposta = await GET(requisicao())

    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toEqual({
      status: "indisponivel",
      componentes: { aplicacao: "ok", banco: "indisponivel" },
    })
  })
})
