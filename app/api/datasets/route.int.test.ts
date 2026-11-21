import { GET } from "@/app/api/datasets/route"
import { lerAmbiente, type Ambiente } from "@/lib/config/ambiente"
import { confirmarImportacao } from "@/lib/server/datasets/importacao-servico"
import { obterBanco } from "@/lib/server/db/cliente"
import {
  criarAmbienteDeTeste,
  USUARIO_ADMIN,
  USUARIO_ANALISTA,
} from "@/test/ambiente-teste"
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
let ambiente: Ambiente

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

describe("GET /api/datasets", () => {
  it.each([
    ["sem cookie", undefined],
    ["com token desconhecido", "token-inventado"],
  ])(
    "%s responde 401 NAO_AUTENTICADO sem dado no corpo (TI-07, parte)",
    async (_, token) => {
      await confirmarImportacao(banco, {
        arquivo: roteiroAlterado("a.csv", 40),
        dados: DADOS_DO_ROTEIRO,
        autor: { usuario: "analista-teste", nome: "Analista Demo" },
        agora: new Date(),
      })

      const resposta = await GET(requisicaoDeRota("/api/datasets", { token }))

      expect(resposta.status).toBe(401)
      expect(await resposta.json()).toEqual({
        code: "NAO_AUTENTICADO",
        message: "Entre para acessar esta área.",
        requestId: resposta.headers.get("x-request-id"),
      })
    }
  )

  it.each([USUARIO_ANALISTA, USUARIO_ADMIN])(
    "%s recebe a lista de datasets com versões",
    async (usuario) => {
      const token = await tokenDoUsuario(usuario, ambiente)
      const { datasetId } = await confirmarImportacao(banco, {
        arquivo: roteiroAlterado("a.csv", 40),
        dados: DADOS_DO_ROTEIRO,
        autor: { usuario: "analista-teste", nome: "Analista Demo" },
        agora: new Date("2026-11-20T14:02:11.000Z"),
      })

      const resposta = await GET(requisicaoDeRota("/api/datasets", { token }))
      const corpo = await resposta.json()

      expect(resposta.status).toBe(200)
      expect(resposta.headers.get("Cache-Control")).toBe("no-store")
      expect(corpo.datasets).toHaveLength(1)
      expect(corpo.datasets[0]).toMatchObject({
        id: datasetId,
        nome: "Roteiro 2025-2026",
        versoes: [{ numero: 1, situacao: "privado", linhasGravadas: 16 }],
      })
    }
  )

  it("sem nenhum dataset responde a lista vazia", async () => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await GET(requisicaoDeRota("/api/datasets", { token }))

    expect(await resposta.json()).toEqual({ datasets: [] })
  })
})
