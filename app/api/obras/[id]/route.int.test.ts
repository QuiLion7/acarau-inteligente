import { count } from "drizzle-orm"

import { PUT } from "@/app/api/obras/[id]/route"
import { lerAmbiente, type Ambiente } from "@/lib/config/ambiente"
import { obterBanco } from "@/lib/server/db/cliente"
import { obraHistorico } from "@/lib/server/db/schema"
import { criarObra } from "@/lib/server/obras/obra-servico"
import { obterObra } from "@/lib/server/obras/obra-repositorio"
import { criarAmbienteDeTeste, USUARIO_ANALISTA } from "@/test/ambiente-teste"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"
import { tokenDoUsuario } from "@/test/importacao-teste"
import {
  contextoDeEscrita,
  entradaDeObra,
  PONTO_FORA_DO_LIMITE,
  pontoInteriorDoBairro,
  requisicaoJson,
} from "@/test/obras-teste"

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

const ID_INEXISTENTE = "6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f"

function editar(
  id: string,
  opcoes: { token?: string; origem?: string | null; corpo?: unknown }
) {
  return PUT(requisicaoJson(`/api/obras/${id}`, { metodo: "PUT", ...opcoes }), {
    params: Promise.resolve({ id }),
  })
}

async function criarNoCentro() {
  return criarObra(
    banco,
    entradaDeObra({
      titulo: "DEMO - Obra original",
      descricao: "Descrição original",
      localizacao: pontoInteriorDoBairro("uv-10"),
    }),
    contextoDeEscrita({ agora: new Date("2026-11-21T14:05:00.000Z") })
  )
}

async function totalDeHistoricos(): Promise<number> {
  const [linha] = await banco.select({ total: count() }).from(obraHistorico)
  return linha?.total ?? 0
}

function eventosDoLog(): Record<string, unknown>[] {
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
})

afterAll(async () => {
  await banco.$client.end()
})

describe("PUT /api/obras/{id}: edição (TI-05, TI-06, CA-04.09, CA-04.10, CA-04.11)", () => {
  it("mudando a situação: 200 e uma entrada no histórico com anterior, nova e o nome do analista", async () => {
    const criada = await criarNoCentro()
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await editar(criada.id, {
      token,
      corpo: {
        titulo: "DEMO - Obra original",
        situacao: "em_andamento",
        localizacao: criada.localizacao,
      },
    })

    expect(resposta.status).toBe(200)
    const editada = await resposta.json()
    expect(editada.situacao).toBe("em_andamento")
    expect(editada.historico).toHaveLength(2)
    expect(editada.historico[0]).toMatchObject({
      situacaoAnterior: "planejada",
      situacaoNova: "em_andamento",
      autorNome: "Analista Demo",
    })
    expect(Date.parse(editada.atualizadoEm)).toBeGreaterThan(
      Date.parse(criada.atualizadoEm)
    )
  })

  it("só a descrição: atualiza a última atualização e não cria entrada no histórico", async () => {
    const criada = await criarNoCentro()
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await editar(criada.id, {
      token,
      corpo: {
        titulo: "DEMO - Obra original",
        situacao: "planejada",
        descricao: "Descrição nova",
        localizacao: criada.localizacao,
      },
    })

    expect(resposta.status).toBe(200)
    const editada = await resposta.json()
    expect(editada.descricao).toBe("Descrição nova")
    expect(editada.historico).toHaveLength(1)
    expect(Date.parse(editada.atualizadoEm)).toBeGreaterThan(
      Date.parse(criada.atualizadoEm)
    )
    expect(await totalDeHistoricos()).toBe(1)
  })

  it("substitui tudo: campo que não vem no corpo volta a ser null", async () => {
    const criada = await criarNoCentro()
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await editar(criada.id, {
      token,
      corpo: { titulo: "DEMO - Obra original", situacao: "planejada" },
    })

    expect(await resposta.json()).toMatchObject({
      descricao: null,
      estadoLocalizacao: "sem-localizacao",
      localizacao: null,
    })
  })

  it("removendo o ponto a obra fica sem localização; trocando de bairro o bairro muda", async () => {
    const criada = await criarNoCentro()
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const outroBairro = await editar(criada.id, {
      token,
      corpo: {
        titulo: "DEMO - Obra original",
        situacao: "planejada",
        localizacao: pontoInteriorDoBairro("uv-03"),
        bairroId: "uv-10",
      },
    })
    const semPonto = await editar(criada.id, {
      token,
      corpo: { titulo: "DEMO - Obra original", situacao: "planejada" },
    })

    expect(await outroBairro.json()).toMatchObject({
      estadoLocalizacao: "dentro-de-bairro",
      bairroId: "uv-03",
    })
    expect(await semPonto.json()).toMatchObject({
      estadoLocalizacao: "sem-localizacao",
      bairroId: null,
      localizacao: null,
    })
  })

  it("ponto fora do município: 400 em campos.localizacao e a obra segue como estava", async () => {
    const criada = await criarNoCentro()
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await editar(criada.id, {
      token,
      corpo: {
        titulo: "DEMO - Outro título",
        situacao: "concluida",
        localizacao: PONTO_FORA_DO_LIMITE,
      },
    })

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toMatchObject({
      details: { campos: { localizacao: expect.any(String) } },
    })
    expect(await obterObra(banco, criada.id)).toEqual(criada)
  })

  it("corpo inválido: 400 por campo e a obra segue como estava", async () => {
    const criada = await criarNoCentro()
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await editar(criada.id, {
      token,
      corpo: { titulo: "", situacao: "planejada" },
    })

    expect(resposta.status).toBe(400)
    expect((await resposta.json()).details.campos).toEqual({
      titulo: "O título deve ter pelo menos 3 caracteres.",
    })
    expect(await obterObra(banco, criada.id)).toEqual(criada)
  })
})

describe("PUT /api/obras/{id}: id (TI-07)", () => {
  it.each([
    ["inexistente", ID_INEXISTENTE],
    ["mal formado", "nao-e-um-uuid"],
  ])("id %s responde 404 NAO_ENCONTRADO", async (_, id) => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await editar(id, {
      token,
      corpo: { titulo: "DEMO - Qualquer", situacao: "planejada" },
    })

    expect(resposta.status).toBe(404)
    expect(await resposta.json()).toMatchObject({ code: "NAO_ENCONTRADO" })
  })
})

describe("PUT /api/obras/{id}: recusas de acesso (TI-04, CA-04.12)", () => {
  it.each([
    ["sem cookie", undefined],
    ["com token desconhecido", "token-inventado"],
  ])(
    "%s responde 401 NAO_AUTENTICADO, sem dado, e a obra não muda",
    async (_, token) => {
      const criada = await criarNoCentro()

      const resposta = await editar(criada.id, {
        token,
        corpo: { titulo: "DEMO - Invasor", situacao: "concluida" },
      })

      expect(resposta.status).toBe(401)
      expect(await resposta.json()).toEqual({
        code: "NAO_AUTENTICADO",
        message: "Entre para acessar esta área.",
        requestId: resposta.headers.get("x-request-id"),
      })
      expect(await obterObra(banco, criada.id)).toEqual(criada)
    }
  )

  it.each([
    ["de outro site", "http://exemplo.com"],
    ["ausente", null],
  ])(
    "Origin %s responde 403 ORIGEM_INVALIDA e a obra não muda",
    async (_, origem) => {
      const criada = await criarNoCentro()
      const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

      const resposta = await editar(criada.id, {
        token,
        origem,
        corpo: { titulo: "DEMO - Invasor", situacao: "concluida" },
      })

      expect(resposta.status).toBe(403)
      expect(await resposta.json()).toMatchObject({ code: "ORIGEM_INVALIDA" })
      expect(await obterObra(banco, criada.id)).toEqual(criada)
    }
  )
})

describe("PUT /api/obras/{id}: auditoria (TI-14, CA-04.24)", () => {
  it("registra obra.editada com autor, obra e se a situação mudou, sem título nem descrição", async () => {
    const criada = await criarNoCentro()
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    await editar(criada.id, {
      token,
      corpo: {
        titulo: "DEMO - Título novo secreto",
        situacao: "em_andamento",
        descricao: "Texto livre sigiloso",
      },
    })
    await editar(criada.id, {
      token,
      corpo: { titulo: "DEMO - Título novo secreto", situacao: "em_andamento" },
    })

    const editadas = eventosDoLog().filter(
      ({ evento }) => evento === "obra.editada"
    )
    expect(editadas).toHaveLength(2)
    expect(editadas[0]).toMatchObject({
      nivel: "info",
      usuario: USUARIO_ANALISTA,
      obraId: criada.id,
      situacaoAlterada: true,
    })
    expect(editadas[1]).toMatchObject({ situacaoAlterada: false })
    const todas = JSON.stringify(eventosDoLog())
    expect(todas).not.toContain("secreto")
    expect(todas).not.toContain("sigiloso")
  })

  it("registra obra.recusada com o motivo e a obra quando o id é válido", async () => {
    const criada = await criarNoCentro()
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    await editar(criada.id, {
      token,
      corpo: { titulo: "x", situacao: "planejada" },
    })
    await editar(ID_INEXISTENTE, {
      token,
      corpo: { titulo: "DEMO - Qualquer", situacao: "planejada" },
    })

    const recusadas = eventosDoLog().filter(
      ({ evento }) => evento === "obra.recusada"
    )
    expect(recusadas).toHaveLength(2)
    expect(recusadas[0]).toMatchObject({
      nivel: "warn",
      usuario: USUARIO_ANALISTA,
      operacao: "editar",
      obraId: criada.id,
      motivo: "VALIDACAO",
    })
    expect(recusadas[1]).toMatchObject({
      obraId: ID_INEXISTENTE,
      motivo: "NAO_ENCONTRADO",
    })
  })

  it("id mal formado vai ao log como recusa sem o texto do segmento da URL", async () => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    await editar("segmento-malicioso", {
      token,
      corpo: { titulo: "DEMO - Qualquer", situacao: "planejada" },
    })

    const [recusada] = eventosDoLog().filter(
      ({ evento }) => evento === "obra.recusada"
    )
    expect(recusada).toMatchObject({ motivo: "NAO_ENCONTRADO" })
    expect(recusada).not.toHaveProperty("obraId")
    expect(JSON.stringify(eventosDoLog())).not.toContain("malicioso")
  })
})
