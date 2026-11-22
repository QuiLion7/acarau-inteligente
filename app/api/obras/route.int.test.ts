import { count, eq } from "drizzle-orm"

import * as rotaDeObra from "@/app/api/obras/[id]/route"
import * as rotaDeObras from "@/app/api/obras/route"
import { POST } from "@/app/api/obras/route"
import { lerAmbiente, type Ambiente } from "@/lib/config/ambiente"
import { obterBanco } from "@/lib/server/db/cliente"
import { obra, obraHistorico } from "@/lib/server/db/schema"
import { LIMITE_OBRAS } from "@/lib/server/obras/obra-servico"
import {
  criarAmbienteDeTeste,
  USUARIO_ADMIN,
  USUARIO_ANALISTA,
} from "@/test/ambiente-teste"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"
import { tokenDoUsuario } from "@/test/importacao-teste"
import {
  PONTO_FORA_DA_COBERTURA,
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

const CORPO_MINIMO = { titulo: "DEMO - Praça da rota", situacao: "planejada" }

const CORPO_MARCADO = { titulo: "DEMO - Marca-secreta", situacao: "planejada" }

function criar(opcoes: {
  token?: string
  origem?: string | null
  corpo?: unknown
}) {
  return POST(requisicaoJson("/api/obras", { metodo: "POST", ...opcoes }))
}

async function totalDe(tabela: typeof obra | typeof obraHistorico) {
  const [linha] = await banco.select({ total: count() }).from(tabela)
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

describe("POST /api/obras: criação (TI-01, TI-02, CA-04.03, CA-04.13)", () => {
  it("o analista cria obra com ponto em bairro: 201, bairro calculado, SINTETICO e histórico inicial com o nome dele", async () => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await criar({
      token,
      corpo: { ...CORPO_MINIMO, localizacao: pontoInteriorDoBairro("uv-10") },
    })

    expect(resposta.status).toBe(201)
    expect(resposta.headers.get("Cache-Control")).toBe("no-store")
    const criada = await resposta.json()
    expect(criada).toMatchObject({
      titulo: "DEMO - Praça da rota",
      situacao: "planejada",
      estadoLocalizacao: "dentro-de-bairro",
      bairroId: "uv-10",
      proveniencia: "SINTETICO",
      historico: [
        {
          situacaoAnterior: null,
          situacaoNova: "planejada",
          autorNome: "Analista Demo",
        },
      ],
    })
    const [linha] = await banco
      .select()
      .from(obra)
      .where(eq(obra.id, criada.id))
    expect(linha).toMatchObject({
      bairroId: "uv-10",
      proveniencia: "SINTETICO",
    })
    expect(await totalDe(obraHistorico)).toBe(1)
  })

  it("o administrador também cria", async () => {
    const token = await tokenDoUsuario(USUARIO_ADMIN, ambiente)

    const resposta = await criar({ token, corpo: CORPO_MINIMO })

    expect(resposta.status).toBe(201)
    expect((await resposta.json()).historico[0].autorNome).toBe(
      "Administrador Demo"
    )
  })

  it("ignora bairroId e proveniencia do corpo: grava o bairro do ponto e SINTETICO", async () => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await criar({
      token,
      corpo: {
        ...CORPO_MINIMO,
        localizacao: pontoInteriorDoBairro("uv-10"),
        bairroId: "uv-03",
        proveniencia: "OFICIAL",
        estadoLocalizacao: "fora-da-cobertura",
      },
    })

    expect(resposta.status).toBe(201)
    const [linha] = await banco.select().from(obra)
    expect(linha).toMatchObject({
      bairroId: "uv-10",
      estadoLocalizacao: "dentro-de-bairro",
      proveniencia: "SINTETICO",
    })
  })

  it("aceita ponto fora da cobertura e obra sem localização", async () => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const foraDaCobertura = await criar({
      token,
      corpo: { ...CORPO_MINIMO, localizacao: PONTO_FORA_DA_COBERTURA },
    })
    const semLocalizacao = await criar({ token, corpo: CORPO_MINIMO })

    expect((await foraDaCobertura.json()).estadoLocalizacao).toBe(
      "fora-da-cobertura"
    )
    expect((await semLocalizacao.json()).estadoLocalizacao).toBe(
      "sem-localizacao"
    )
  })
})

describe("POST /api/obras: validação (TI-03, CA-04.06, CA-04.08)", () => {
  it("ponto fora do município: 400 VALIDACAO em campos.localizacao e nada é gravado", async () => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await criar({
      token,
      corpo: { ...CORPO_MINIMO, localizacao: PONTO_FORA_DO_LIMITE },
    })

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toMatchObject({
      code: "VALIDACAO",
      details: {
        campos: { localizacao: "O ponto está fora do município de Acaraú" },
      },
    })
    expect(await totalDe(obra)).toBe(0)
  })

  it("corpo inválido: 400 com a mensagem de cada campo, sem eco do valor enviado e nada gravado", async () => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await criar({
      token,
      corpo: {
        titulo: "ab",
        situacao: "planejada",
        descricao: "x".repeat(2001),
        dataInicio: "2026-12-02",
        dataPrevista: "2026-12-01",
        valorPrevistoCentavos: -5,
      },
    })

    expect(resposta.status).toBe(400)
    const corpo = await resposta.json()
    expect(corpo.details.campos).toEqual({
      titulo: "O título deve ter pelo menos 3 caracteres.",
      descricao: "A descrição deve ter no máximo 2000 caracteres.",
      dataPrevista: "A data prevista não pode ser anterior à data de início.",
      valorPrevistoCentavos: "O valor previsto não pode ser negativo.",
    })
    expect(await totalDe(obra)).toBe(0)
  })

  it("só a latitude: 400 com o erro em campos.localizacao e nada gravado", async () => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await criar({
      token,
      corpo: { ...CORPO_MINIMO, localizacao: { latitude: -2.88 } },
    })

    expect(resposta.status).toBe(400)
    expect(Object.keys((await resposta.json()).details.campos)).toEqual([
      "localizacao",
    ])
    expect(await totalDe(obra)).toBe(0)
  })

  it("situação fora da lista: 400 no campo situacao, sem repetir o que foi enviado", async () => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await criar({
      token,
      corpo: { ...CORPO_MINIMO, situacao: "SITUACAO-SECRETA" },
    })

    expect(resposta.status).toBe(400)
    const corpo = await resposta.json()
    expect(corpo.details.campos).toEqual({
      situacao: "Escolha uma das situações permitidas.",
    })
    expect(JSON.stringify(corpo)).not.toContain("SECRETA")
  })

  it.each([
    ["JSON inválido", "{isto nao e json"],
    ["corpo vazio", undefined],
  ])("%s: 400 VALIDACAO", async (_descricao, corpo) => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await criar({ token, corpo })

    expect(resposta.status).toBe(400)
    expect((await resposta.json()).code).toBe("VALIDACAO")
  })
})

describe("POST /api/obras: recusas de acesso (TI-04, CA-04.12)", () => {
  it.each([
    ["sem cookie", undefined],
    ["com token desconhecido", "token-inventado"],
  ])(
    "%s responde 401 NAO_AUTENTICADO, sem dado, e não grava",
    async (_, token) => {
      const resposta = await criar({ token, corpo: CORPO_MINIMO })

      expect(resposta.status).toBe(401)
      expect(await resposta.json()).toEqual({
        code: "NAO_AUTENTICADO",
        message: "Entre para acessar esta área.",
        requestId: resposta.headers.get("x-request-id"),
      })
      expect(await totalDe(obra)).toBe(0)
    }
  )

  it.each([
    ["de outro site", "http://exemplo.com"],
    ["ausente", null],
  ])(
    "Origin %s responde 403 ORIGEM_INVALIDA até para o analista e não grava",
    async (_, origem) => {
      const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

      const resposta = await criar({ token, origem, corpo: CORPO_MINIMO })

      expect(resposta.status).toBe(403)
      expect(await resposta.json()).toMatchObject({ code: "ORIGEM_INVALIDA" })
      expect(await totalDe(obra)).toBe(0)
    }
  )
})

describe("POST /api/obras: teto (TI-09)", () => {
  it("com 200 obras responde 409 LIMITE_OBRAS e não grava", async () => {
    await banco.insert(obra).values(
      Array.from({ length: LIMITE_OBRAS }, (_, indice) => ({
        titulo: `DEMO - Obra ${indice}`,
        situacao: "planejada",
        estadoLocalizacao: "sem-localizacao",
        criadoPor: "analista-teste",
        atualizadoPor: "analista-teste",
      }))
    )
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await criar({ token, corpo: CORPO_MINIMO })

    expect(resposta.status).toBe(409)
    expect(await resposta.json()).toMatchObject({
      code: "LIMITE_OBRAS",
      message:
        "A demonstração aceita até 200 obras. Reinicie a demonstração para liberar espaço.",
    })
    expect(await totalDe(obra)).toBe(LIMITE_OBRAS)
  })
})

describe("rotas de obras: o que não existe (TI-08, CA-04.20)", () => {
  it("só o POST é exportado em /api/obras; GET, PUT, PATCH e DELETE ficam sem handler (405 pelo Next)", () => {
    expect(Object.keys(rotaDeObras).toSorted()).toEqual(["POST"])
  })

  it("só o PUT é exportado em /api/obras/{id}: sem DELETE, PATCH, GET e sem rota de histórico", () => {
    expect(Object.keys(rotaDeObra).toSorted()).toEqual(["PUT"])
  })
})

describe("POST /api/obras: auditoria (TI-14, CA-04.24)", () => {
  it("registra obra.criada com autor, obra e resultado, sem título nem descrição", async () => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await criar({
      token,
      corpo: { ...CORPO_MINIMO, descricao: "Texto livre sigiloso" },
    })

    const { id } = await resposta.json()
    const criadas = eventosDoLog().filter(
      ({ evento }) => evento === "obra.criada"
    )
    expect(criadas).toHaveLength(1)
    expect(criadas[0]).toMatchObject({
      nivel: "info",
      usuario: USUARIO_ANALISTA,
      obraId: id,
      situacao: "planejada",
      estadoLocalizacao: "sem-localizacao",
    })
    const todas = JSON.stringify(eventosDoLog())
    expect(todas).not.toContain("DEMO - Praça da rota")
    expect(todas).not.toContain("sigiloso")
  })

  it.each([
    [
      "validação",
      {
        ...CORPO_MARCADO,
        dataInicio: "2026-12-02",
        dataPrevista: "2026-12-01",
      },
      "VALIDACAO",
    ],
    [
      "ponto fora do município",
      { ...CORPO_MARCADO, localizacao: PONTO_FORA_DO_LIMITE },
      "VALIDACAO",
    ],
  ])(
    "registra obra.recusada por %s com o motivo e sem o conteúdo",
    async (_, corpo, motivo) => {
      const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

      await criar({ token, corpo })

      const recusadas = eventosDoLog().filter(
        ({ evento }) => evento === "obra.recusada"
      )
      expect(recusadas).toHaveLength(1)
      expect(recusadas[0]).toMatchObject({
        nivel: "warn",
        usuario: USUARIO_ANALISTA,
        operacao: "criar",
        motivo,
      })
      expect(recusadas[0]).not.toHaveProperty("obraId")
      expect(JSON.stringify(recusadas[0])).not.toContain("Marca-secreta")
      expect(
        eventosDoLog().some(({ evento }) => evento === "obra.criada")
      ).toBe(false)
    }
  )

  it("registra obra.recusada com motivo LIMITE_OBRAS no teto", async () => {
    await banco.insert(obra).values(
      Array.from({ length: LIMITE_OBRAS }, (_, indice) => ({
        titulo: `DEMO - Obra ${indice}`,
        situacao: "planejada",
        estadoLocalizacao: "sem-localizacao",
        criadoPor: "analista-teste",
        atualizadoPor: "analista-teste",
      }))
    )
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    await criar({ token, corpo: CORPO_MINIMO })

    const [recusada] = eventosDoLog().filter(
      ({ evento }) => evento === "obra.recusada"
    )
    expect(recusada).toMatchObject({
      operacao: "criar",
      motivo: "LIMITE_OBRAS",
    })
  })

  it("a recusa por sessão fica no auth.acesso_negado do rotaApi, sem obra.recusada", async () => {
    await criar({ corpo: CORPO_MINIMO })

    const eventos = eventosDoLog().map(({ evento }) => evento)
    expect(eventos).toContain("auth.acesso_negado")
    expect(eventos).not.toContain("obra.recusada")
  })
})
