import { createHash } from "node:crypto"

import { NextRequest } from "next/server"

import { GET } from "@/app/api/importacoes/conteudo/[hash]/route"
import { POST } from "@/app/api/importacoes/route"
import { NOME_COOKIE_SESSAO } from "@/lib/auth/nome-cookie-sessao"
import { lerAmbiente, type Ambiente } from "@/lib/config/ambiente"
import { obterBanco } from "@/lib/server/db/cliente"
import { criarAmbienteDeTeste, USUARIO_ANALISTA } from "@/test/ambiente-teste"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"
import {
  bytesSinteticos,
  requisicaoDeImportacao,
  tokenDoUsuario,
} from "@/test/importacao-teste"

jest.mock("@/lib/server/db/cliente", () => ({
  ...jest.requireActual("@/lib/server/db/cliente"),
  obterBanco: jest.fn(),
}))
jest.mock("@/lib/config/ambiente", () => ({
  ...jest.requireActual("@/lib/config/ambiente"),
  lerAmbiente: jest.fn(),
}))

const banco = criarBancoDeTeste()
const HASH_DO_ROTEIRO = createHash("sha256")
  .update(bytesSinteticos("saude-roteiro_DEMO.csv"))
  .digest("hex")
const HASH_INEXISTENTE = "0".repeat(64)

let ambiente: Ambiente
let token: string

function consultar(hash: string, tokenDaSessao?: string) {
  const requisicao = new NextRequest(
    `http://localhost:3000/api/importacoes/conteudo/${hash}`,
    {
      headers: tokenDaSessao
        ? { cookie: `${NOME_COOKIE_SESSAO}=${tokenDaSessao}` }
        : {},
    }
  )
  return GET(requisicao, { params: Promise.resolve({ hash }) })
}

beforeAll(async () => {
  ambiente = await criarAmbienteDeTeste()
})

beforeEach(async () => {
  jest.mocked(obterBanco).mockReturnValue(banco)
  jest.mocked(lerAmbiente).mockReturnValue(ambiente)
  jest.spyOn(process.stdout, "write").mockImplementation(() => true)
  await limparTabelas(banco)
  token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("GET /api/importacoes/conteudo/{hash}", () => {
  it("responde importado: false para um conteúdo que nunca foi gravado", async () => {
    const resposta = await consultar(HASH_INEXISTENTE, token)

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ importado: false })
  })

  it("responde com o dataset e a versão que já têm o conteúdo, qualquer que tenha sido o nome do arquivo (TI-04)", async () => {
    const gravada = await (
      await POST(await requisicaoDeImportacao({ token }))
    ).json()

    const resposta = await consultar(HASH_DO_ROTEIRO, token)

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      importado: true,
      datasetId: gravada.datasetId,
      nome: "Roteiro 2025-2026",
      numero: 1,
    })
  })

  it.each([
    ["curto demais", "abc"],
    ["em maiúsculas", "A".repeat(64)],
    ["com caractere fora do hexadecimal", `${"0".repeat(63)}g`],
    ["com mais de 64 caracteres", "0".repeat(65)],
  ])("hash %s responde 400 VALIDACAO sem eco do valor", async (_, hash) => {
    const resposta = await consultar(hash, token)
    const texto = await resposta.text()

    expect(resposta.status).toBe(400)
    expect(JSON.parse(texto)).toMatchObject({
      code: "VALIDACAO",
      details: { campos: { hash: expect.any(String) } },
    })
    expect(texto).not.toContain(hash)
  })

  it.each([
    ["sem cookie", undefined],
    ["com token desconhecido", "token-inventado"],
  ])(
    "%s responde 401 NAO_AUTENTICADO sem dado no corpo (TI-07, parte)",
    async (_, tokenRecebido) => {
      await POST(await requisicaoDeImportacao({ token }))

      const resposta = await consultar(HASH_DO_ROTEIRO, tokenRecebido)

      expect(resposta.status).toBe(401)
      expect(await resposta.json()).toEqual({
        code: "NAO_AUTENTICADO",
        message: "Entre para acessar esta área.",
        requestId: resposta.headers.get("x-request-id"),
      })
    }
  )
})
