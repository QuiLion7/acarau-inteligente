import { GET } from "@/app/api/datasets/versoes/[id]/relatorio/route"
import { lerAmbiente, type Ambiente } from "@/lib/config/ambiente"
import { confirmarImportacao } from "@/lib/server/datasets/importacao-servico"
import { obterBanco } from "@/lib/server/db/cliente"
import { criarAmbienteDeTeste, USUARIO_ANALISTA } from "@/test/ambiente-teste"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"
import {
  DADOS_DO_ROTEIRO,
  requisicaoDeRota,
  roteiroAlterado,
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
const ID_INEXISTENTE = "7d0c2b8e-1f3a-4c55-9a0e-2d5b8f7c4e10"
let ambiente: Ambiente

function consultar(id: string, token?: string) {
  return GET(
    requisicaoDeRota(`/api/datasets/versoes/${id}/relatorio`, { token }),
    { params: Promise.resolve({ id }) }
  )
}

beforeAll(async () => {
  ambiente = await criarAmbienteDeTeste()
})

beforeEach(async () => {
  jest.mocked(obterBanco).mockReturnValue(banco)
  jest.mocked(lerAmbiente).mockReturnValue(ambiente)
  jest.spyOn(process.stdout, "write").mockImplementation(() => true)
  await limparTabelas(banco)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("GET /api/datasets/versoes/{id}/relatorio", () => {
  it("responde 401 sem sessão, sem nenhum dado do relatório (TI-07, parte)", async () => {
    const { versaoId } = await confirmarImportacao(banco, {
      arquivo: roteiroAlterado("a.csv", 40),
      dados: DADOS_DO_ROTEIRO,
      autor: { usuario: "analista-teste", nome: "Analista Demo" },
      agora: new Date(),
    })

    const resposta = await consultar(versaoId)

    expect(resposta.status).toBe(401)
    expect(await resposta.json()).toEqual({
      code: "NAO_AUTENTICADO",
      message: "Entre para acessar esta área.",
      requestId: resposta.headers.get("x-request-id"),
    })
  })

  it("responde a versão, o dataset e o relatório de processamento ao analista", async () => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)
    const { versaoId } = await confirmarImportacao(banco, {
      arquivo: roteiroAlterado("a.csv", 40),
      dados: DADOS_DO_ROTEIRO,
      autor: { usuario: "analista-teste", nome: "Analista Demo" },
      agora: new Date("2026-11-20T14:02:11.000Z"),
    })

    const resposta = await consultar(versaoId, token)

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toMatchObject({
      versao: { id: versaoId, autor: "Analista Demo", situacao: "privado" },
      dataset: { nome: "Roteiro 2025-2026", proveniencia: "SINTETICO" },
      relatorio: { nomeArquivo: "a.csv", contagens: { lidas: 16 } },
    })
  })

  it("versão inexistente responde 404 NAO_ENCONTRADO", async () => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await consultar(ID_INEXISTENTE, token)

    expect(resposta.status).toBe(404)
    expect(await resposta.json()).toMatchObject({ code: "NAO_ENCONTRADO" })
  })

  it("id que não é uuid responde 400 VALIDACAO sem eco do valor", async () => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await consultar("nao-e-uuid", token)
    const texto = await resposta.text()

    expect(resposta.status).toBe(400)
    expect(JSON.parse(texto)).toMatchObject({
      code: "VALIDACAO",
      details: { campos: { id: expect.any(String) } },
    })
    expect(texto).not.toContain("nao-e-uuid")
  })
})
