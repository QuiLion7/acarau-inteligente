import { DELETE, POST } from "@/app/api/datasets/versoes/[id]/publicacao/route"
import { lerAmbiente, type Ambiente } from "@/lib/config/ambiente"
import { obterVersaoVisivel } from "@/lib/server/datasets/dataset-repositorio"
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
let token: string
let escrita: jest.SpyInstance

type Metodo = "POST" | "DELETE"
const HANDLERS = { POST, DELETE }

function chamar(
  metodo: Metodo,
  id: string,
  opcoes: { token?: string; origem?: string | null } = {}
) {
  return HANDLERS[metodo](
    requisicaoDeRota(`/api/datasets/versoes/${id}/publicacao`, {
      metodo,
      ...opcoes,
    }),
    { params: Promise.resolve({ id }) }
  )
}

function importar() {
  return confirmarImportacao(banco, {
    arquivo: roteiroAlterado("a.csv", 40),
    dados: DADOS_DO_ROTEIRO,
    autor: { usuario: "analista-teste", nome: "Analista Demo" },
    agora: new Date("2026-11-20T14:02:11.000Z"),
  })
}

function eventosDeLog(): Record<string, unknown>[] {
  return escrita.mock.calls.map(([linha]) => JSON.parse(String(linha)))
}

beforeAll(async () => {
  ambiente = await criarAmbienteDeTeste()
})

beforeEach(async () => {
  jest.mocked(obterBanco).mockReturnValue(banco)
  jest.mocked(lerAmbiente).mockReturnValue(ambiente)
  escrita = jest.spyOn(process.stdout, "write").mockImplementation(() => true)
  await limparTabelas(banco)
  token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)
})

afterAll(async () => {
  await banco.$client.end()
})

describe.each<Metodo>(["POST", "DELETE"])(
  "%s /api/datasets/versoes/{id}/publicacao: recusas (TI-07, parte)",
  (metodo) => {
    it.each([
      ["sem cookie", undefined],
      ["com token desconhecido", "token-inventado"],
    ])(
      "%s responde 401 NAO_AUTENTICADO e não muda a versão",
      async (_, tokenRecebido) => {
        const { versaoId } = await importar()

        const resposta = await chamar(metodo, versaoId, {
          token: tokenRecebido,
        })

        expect(resposta.status).toBe(401)
        expect(await resposta.json()).toEqual({
          code: "NAO_AUTENTICADO",
          message: "Entre para acessar esta área.",
          requestId: resposta.headers.get("x-request-id"),
        })
      }
    )

    it.each([
      ["de outro site", "http://exemplo.com"],
      ["ausente", null],
    ])(
      "Origin %s responde 403 ORIGEM_INVALIDA sem dado no corpo",
      async (_, origem) => {
        const { versaoId } = await importar()

        const resposta = await chamar(metodo, versaoId, { token, origem })

        expect(resposta.status).toBe(403)
        expect(await resposta.json()).toEqual({
          code: "ORIGEM_INVALIDA",
          message: "A origem da requisição não é permitida.",
          requestId: resposta.headers.get("x-request-id"),
        })
      }
    )

    it("id que não é uuid responde 400 VALIDACAO sem eco do valor", async () => {
      const resposta = await chamar(metodo, "nao-e-uuid", { token })
      const texto = await resposta.text()

      expect(resposta.status).toBe(400)
      expect(JSON.parse(texto)).toMatchObject({ code: "VALIDACAO" })
      expect(texto).not.toContain("nao-e-uuid")
    })

    it("versão inexistente responde 404 NAO_ENCONTRADO", async () => {
      const resposta = await chamar(metodo, ID_INEXISTENTE, { token })

      expect(resposta.status).toBe(404)
      expect(await resposta.json()).toMatchObject({ code: "NAO_ENCONTRADO" })
    })
  }
)

describe("publicar e despublicar pela rota (TI-06)", () => {
  it("publica, responde 200 repetido e despublica, com auditoria sem dado do arquivo", async () => {
    const { versaoId } = await importar()

    const publicada = await chamar("POST", versaoId, { token })
    const repetida = await chamar("POST", versaoId, { token })

    expect(publicada.status).toBe(200)
    const corpo = await publicada.json()
    expect(corpo).toMatchObject({ id: versaoId, situacao: "publicado" })
    expect(await repetida.json()).toEqual(corpo)
    expect(
      await obterVersaoVisivel(banco, { versaoId, papel: "visitante" })
    ).toMatchObject({ status: "ok" })

    const despublicada = await chamar("DELETE", versaoId, { token })

    expect(despublicada.status).toBe(200)
    expect(await despublicada.json()).toMatchObject({
      situacao: "privado",
      publicadoEm: null,
    })
    expect(
      await obterVersaoVisivel(banco, { versaoId, papel: "visitante" })
    ).toEqual({ status: "nao-encontrada" })
    expect(
      eventosDeLog().map(({ evento, usuario, versaoId: id }) => [
        evento,
        usuario,
        id,
      ])
    ).toEqual([
      ["dataset.publicado", USUARIO_ANALISTA, versaoId],
      ["dataset.publicado", USUARIO_ANALISTA, versaoId],
      ["dataset.despublicado", USUARIO_ANALISTA, versaoId],
    ])
  })
})
