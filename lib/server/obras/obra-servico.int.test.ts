import { count, eq } from "drizzle-orm"

import {
  LIMITE_OBRAS,
  criarObra,
  editarObra,
} from "@/lib/server/obras/obra-servico"
import { obterObra } from "@/lib/server/obras/obra-repositorio"
import { obra, obraHistorico } from "@/lib/server/db/schema"
import { ErroApi } from "@/lib/server/http/erro-api"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"
import {
  AUTOR_ANALISTA,
  PONTO_FORA_DA_COBERTURA,
  PONTO_FORA_DO_LIMITE,
  contextoDeEscrita,
  entradaDeObra,
  pontoInteriorDoBairro,
} from "@/test/obras-teste"

const banco = criarBancoDeTeste()

async function contarObras(): Promise<number> {
  const [linha] = await banco.select({ total: count() }).from(obra)
  return linha?.total ?? 0
}

async function erroDe(operacao: Promise<unknown>): Promise<ErroApi> {
  try {
    await operacao
  } catch (erro) {
    if (erro instanceof ErroApi) return erro
    throw erro
  }
  throw new Error("A operação deveria ter falhado.")
}

beforeEach(async () => {
  await limparTabelas(banco)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("criarObra (TI-01, serviço)", () => {
  it("grava o bairro calculado do ponto, SINTETICO e a entrada inicial do histórico com o nome do autor", async () => {
    const criada = await criarObra(
      banco,
      entradaDeObra({ localizacao: pontoInteriorDoBairro("uv-10") }),
      contextoDeEscrita()
    )

    expect(criada).toMatchObject({
      titulo: "DEMO - Obra de teste",
      situacao: "planejada",
      estadoLocalizacao: "dentro-de-bairro",
      bairroId: "uv-10",
      proveniencia: "SINTETICO",
      atualizadoEm: "2026-11-21T14:05:00.000Z",
    })
    expect(criada.historico).toEqual([
      {
        situacaoAnterior: null,
        situacaoNova: "planejada",
        autorNome: "Analista Demo",
        registradoEm: "2026-11-21T14:05:00.000Z",
      },
    ])
    const [linha] = await banco
      .select()
      .from(obra)
      .where(eq(obra.id, criada.id))
    expect(linha).toMatchObject({
      criadoPor: "analista-teste",
      atualizadoPor: "analista-teste",
    })
  })

  it("grava fora da cobertura quando o ponto está no município e fora das UVs", async () => {
    const criada = await criarObra(
      banco,
      entradaDeObra({ localizacao: PONTO_FORA_DA_COBERTURA }),
      contextoDeEscrita()
    )

    expect(criada).toMatchObject({
      estadoLocalizacao: "fora-da-cobertura",
      bairroId: null,
      localizacao: PONTO_FORA_DA_COBERTURA,
    })
  })

  it("grava sem localização quando não há ponto", async () => {
    const criada = await criarObra(banco, entradaDeObra(), contextoDeEscrita())

    expect(criada).toMatchObject({
      estadoLocalizacao: "sem-localizacao",
      bairroId: null,
      localizacao: null,
    })
  })

  it("recusa ponto fora do município com o erro em campos.localizacao e não grava nada", async () => {
    const erro = await erroDe(
      criarObra(
        banco,
        entradaDeObra({ localizacao: PONTO_FORA_DO_LIMITE }),
        contextoDeEscrita()
      )
    )

    expect(erro.code).toBe("VALIDACAO")
    expect(erro.details).toEqual({
      campos: { localizacao: "O ponto está fora do município de Acaraú" },
    })
    expect(await contarObras()).toBe(0)
  })
})

describe("criarObra com o teto (TI-09, serviço)", () => {
  async function gravarObras(total: number) {
    await banco.insert(obra).values(
      Array.from({ length: total }, (_, indice) => ({
        titulo: `DEMO - Obra ${indice}`,
        situacao: "planejada",
        estadoLocalizacao: "sem-localizacao",
        criadoPor: "analista-teste",
        atualizadoPor: "analista-teste",
      }))
    )
  }

  it("aceita a obra de número 200 e recusa a 201 sem gravar", async () => {
    await gravarObras(LIMITE_OBRAS - 1)

    await criarObra(banco, entradaDeObra(), contextoDeEscrita())
    expect(await contarObras()).toBe(LIMITE_OBRAS)

    const erro = await erroDe(
      criarObra(banco, entradaDeObra(), contextoDeEscrita())
    )
    expect(erro.code).toBe("LIMITE_OBRAS")
    expect(erro.status).toBe(409)
    expect(await contarObras()).toBe(LIMITE_OBRAS)
    const [historico] = await banco
      .select({ total: count() })
      .from(obraHistorico)
    expect(historico?.total).toBe(1)
  })
})

describe("editarObra (TI-05, TI-06, serviço)", () => {
  async function criarNoCentro() {
    return criarObra(
      banco,
      entradaDeObra({ localizacao: pontoInteriorDoBairro("uv-10") }),
      contextoDeEscrita()
    )
  }

  it("com mudança de situação cria uma entrada com situação anterior, nova, autor e instante", async () => {
    const criada = await criarNoCentro()
    const depois = new Date("2026-11-21T15:30:00.000Z")

    const { obra: editada, situacaoAlterada } = await editarObra(
      banco,
      criada.id,
      entradaDeObra({
        situacao: "em_andamento",
        localizacao: criada.localizacao,
      }),
      contextoDeEscrita({
        autor: { ...AUTOR_ANALISTA, nome: "Outra Analista" },
        agora: depois,
      })
    )

    expect(situacaoAlterada).toBe(true)
    expect(editada.situacao).toBe("em_andamento")
    expect(editada.atualizadoEm).toBe("2026-11-21T15:30:00.000Z")
    expect(editada.historico).toEqual([
      {
        situacaoAnterior: "planejada",
        situacaoNova: "em_andamento",
        autorNome: "Outra Analista",
        registradoEm: "2026-11-21T15:30:00.000Z",
      },
      expect.objectContaining({
        situacaoAnterior: null,
        situacaoNova: "planejada",
      }),
    ])
  })

  it("só da descrição atualiza a última atualização e não cria entrada no histórico", async () => {
    const criada = await criarNoCentro()

    const { obra: editada, situacaoAlterada } = await editarObra(
      banco,
      criada.id,
      entradaDeObra({
        descricao: "Texto novo",
        localizacao: criada.localizacao,
      }),
      contextoDeEscrita({ agora: new Date("2026-11-22T09:00:00.000Z") })
    )

    expect(situacaoAlterada).toBe(false)
    expect(editada.descricao).toBe("Texto novo")
    expect(editada.atualizadoEm).toBe("2026-11-22T09:00:00.000Z")
    expect(editada.historico).toHaveLength(1)
  })

  it("trocar o ponto de bairro recalcula o bairro", async () => {
    const criada = await criarNoCentro()

    const { obra: editada } = await editarObra(
      banco,
      criada.id,
      entradaDeObra({ localizacao: pontoInteriorDoBairro("uv-03") }),
      contextoDeEscrita()
    )

    expect(editada).toMatchObject({
      estadoLocalizacao: "dentro-de-bairro",
      bairroId: "uv-03",
    })
  })

  it("remover o ponto deixa a obra sem localização, sem bairro e sem coordenadas", async () => {
    const criada = await criarNoCentro()

    const { obra: editada } = await editarObra(
      banco,
      criada.id,
      entradaDeObra(),
      contextoDeEscrita()
    )

    expect(editada).toMatchObject({
      estadoLocalizacao: "sem-localizacao",
      bairroId: null,
      localizacao: null,
    })
  })

  it("recusa ponto fora do município e mantém a obra como estava", async () => {
    const criada = await criarNoCentro()

    const erro = await erroDe(
      editarObra(
        banco,
        criada.id,
        entradaDeObra({ localizacao: PONTO_FORA_DO_LIMITE }),
        contextoDeEscrita()
      )
    )

    expect(erro.code).toBe("VALIDACAO")
    expect(await obterObra(banco, criada.id)).toEqual(criada)
  })

  it("responde não encontrado para id inexistente e para id mal formado", async () => {
    const inexistente = "6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f"

    const [primeiro, segundo] = await Promise.all([
      erroDe(
        editarObra(banco, inexistente, entradaDeObra(), contextoDeEscrita())
      ),
      erroDe(
        editarObra(banco, "nao-e-uuid", entradaDeObra(), contextoDeEscrita())
      ),
    ])

    expect(primeiro.code).toBe("NAO_ENCONTRADO")
    expect(segundo.code).toBe("NAO_ENCONTRADO")
  })

  it("dois saves simultâneos de situação se enfileiram: vale o último e o histórico registra as duas mudanças", async () => {
    const criada = await criarNoCentro()
    const salvar = (situacao: "em_andamento" | "concluida", minuto: number) =>
      editarObra(
        banco,
        criada.id,
        entradaDeObra({ situacao, localizacao: criada.localizacao }),
        contextoDeEscrita({
          agora: new Date(Date.UTC(2026, 10, 22, 10, minuto)),
        })
      )

    await Promise.all([salvar("em_andamento", 1), salvar("concluida", 2)])

    const final = await obterObra(banco, criada.id)
    expect(final?.historico).toHaveLength(3)
    expect(
      final?.historico.map(({ situacaoNova }) => situacaoNova).toSorted()
    ).toEqual(["concluida", "em_andamento", "planejada"])
  })
})
