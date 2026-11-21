import { count } from "drizzle-orm"

import { POST } from "@/app/api/demo/reset/route"
import { lerAmbiente, type Ambiente } from "@/lib/config/ambiente"
import { confirmarImportacao } from "@/lib/server/datasets/importacao-servico"
import { obterBanco } from "@/lib/server/db/cliente"
import { dataset } from "@/lib/server/db/schema"
import {
  criarAmbienteDeTeste,
  USUARIO_ADMIN,
  USUARIO_ANALISTA,
} from "@/test/ambiente-teste"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"
import {
  bytesSinteticos,
  DADOS_DO_ROTEIRO,
  requisicaoDeRota,
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
let escrita: jest.SpyInstance

function reiniciar(opcoes: { token?: string; origem?: string | null } = {}) {
  return POST(
    requisicaoDeRota("/api/demo/reset", { metodo: "POST", ...opcoes })
  )
}

async function totalDeDatasets(): Promise<number> {
  const [linha] = await banco.select({ total: count() }).from(dataset)
  return linha?.total ?? 0
}

async function importarRoteiro() {
  await confirmarImportacao(banco, {
    arquivo: {
      nome: "roteiro.csv",
      bytes: bytesSinteticos("saude-roteiro_DEMO.csv"),
    },
    dados: DADOS_DO_ROTEIRO,
    autor: { usuario: "analista-teste", nome: "Analista Demo" },
    agora: new Date(),
  })
}

beforeAll(async () => {
  ambiente = await criarAmbienteDeTeste()
})

beforeEach(async () => {
  jest.mocked(obterBanco).mockReturnValue(banco)
  jest.mocked(lerAmbiente).mockReturnValue(ambiente)
  escrita = jest.spyOn(process.stdout, "write").mockImplementation(() => true)
  await limparTabelas(banco)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("POST /api/demo/reset: recusas (TI-07, parte, CA-02.18)", () => {
  it.each([
    ["sem cookie", undefined],
    ["com token desconhecido", "token-inventado"],
  ])(
    "%s responde 401 NAO_AUTENTICADO sem dado e não apaga nada",
    async (_, token) => {
      await importarRoteiro()

      const resposta = await reiniciar({ token })

      expect(resposta.status).toBe(401)
      expect(await resposta.json()).toEqual({
        code: "NAO_AUTENTICADO",
        message: "Entre para acessar esta área.",
        requestId: resposta.headers.get("x-request-id"),
      })
      expect(await totalDeDatasets()).toBe(1)
    }
  )

  it("o analista recebe 403 SEM_PERMISSAO, sem dado, e nada é apagado", async () => {
    await importarRoteiro()
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await reiniciar({ token })

    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({
      code: "SEM_PERMISSAO",
      message: "Você não tem permissão para acessar esta área.",
      requestId: resposta.headers.get("x-request-id"),
    })
    expect(await totalDeDatasets()).toBe(1)
  })

  it.each([
    ["de outro site", "http://exemplo.com"],
    ["ausente", null],
  ])(
    "Origin %s responde 403 ORIGEM_INVALIDA até para o administrador",
    async (_, origem) => {
      await importarRoteiro()
      const token = await tokenDoUsuario(USUARIO_ADMIN, ambiente)

      const resposta = await reiniciar({ token, origem })

      expect(resposta.status).toBe(403)
      expect(await resposta.json()).toMatchObject({ code: "ORIGEM_INVALIDA" })
      expect(await totalDeDatasets()).toBe(1)
    }
  )
})

describe("POST /api/demo/reset: administrador (CA-02.29)", () => {
  it("responde 204 sem corpo, restaura o pré-carregado e registra demo.reset com o usuário", async () => {
    await importarRoteiro()
    const token = await tokenDoUsuario(USUARIO_ADMIN, ambiente)

    const resposta = await reiniciar({ token })

    expect(resposta.status).toBe(204)
    expect(await resposta.text()).toBe("")
    expect(resposta.headers.get("Cache-Control")).toBe("no-store")
    const [conjunto] = await banco.select().from(dataset)
    expect(conjunto?.preCarregado).toBe(true)
    expect(await totalDeDatasets()).toBe(1)
    const eventos = escrita.mock.calls.map(([linha]) =>
      JSON.parse(String(linha))
    )
    expect(eventos.find(({ evento }) => evento === "demo.reset")).toMatchObject(
      {
        usuario: USUARIO_ADMIN,
        datasetsRemovidos: 1,
      }
    )
  })

  it("repetir devolve 204 e o mesmo estado", async () => {
    const token = await tokenDoUsuario(USUARIO_ADMIN, ambiente)

    const primeira = await reiniciar({ token })
    const segunda = await reiniciar({ token })

    expect([primeira.status, segunda.status]).toEqual([204, 204])
    expect(await totalDeDatasets()).toBe(1)
  })
})
