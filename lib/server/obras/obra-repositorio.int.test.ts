import {
  listarObras,
  obterObra,
  resumirObrasParaFontes,
} from "@/lib/server/obras/obra-repositorio"
import { obra, obraHistorico } from "@/lib/server/db/schema"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"

const banco = criarBancoDeTeste()

const ID_ANTIGA = "11111111-1111-4111-8111-111111111111"
const ID_RECENTE = "22222222-2222-4222-8222-222222222222"
const ID_SEM_HISTORICO_EXTRA = "33333333-3333-4333-8333-333333333333"

const BASE = {
  situacao: "planejada",
  estadoLocalizacao: "sem-localizacao",
  criadoPor: "analista-teste",
  atualizadoPor: "analista-teste",
}

async function gravarObrasComHistorico() {
  await banco.insert(obra).values([
    {
      ...BASE,
      id: ID_ANTIGA,
      titulo: "DEMO - Antiga",
      situacao: "concluida",
      atualizadoEm: new Date("2026-11-01T10:00:00.000Z"),
    },
    {
      ...BASE,
      id: ID_RECENTE,
      titulo: "DEMO - Recente",
      situacao: "em_andamento",
      categoria: "drenagem",
      dataInicio: "2026-12-01",
      dataPrevista: "2027-03-31",
      valorPrevistoCentavos: 25_000_000,
      longitude: -40.14,
      latitude: -2.88,
      estadoLocalizacao: "fora-da-cobertura",
      atualizadoEm: new Date("2026-11-10T10:00:00.000Z"),
    },
    {
      ...BASE,
      id: ID_SEM_HISTORICO_EXTRA,
      titulo: "DEMO - Do meio",
      atualizadoEm: new Date("2026-11-05T10:00:00.000Z"),
    },
  ])
  await banco.insert(obraHistorico).values([
    {
      obraId: ID_ANTIGA,
      situacaoAnterior: null,
      situacaoNova: "planejada",
      autorNome: "Equipe da demonstração",
      registradoEm: new Date("2026-10-01T10:00:00.000Z"),
    },
    {
      obraId: ID_ANTIGA,
      situacaoAnterior: "planejada",
      situacaoNova: "concluida",
      autorNome: "Analista Demo",
      registradoEm: new Date("2026-11-01T10:00:00.000Z"),
    },
    {
      obraId: ID_RECENTE,
      situacaoAnterior: null,
      situacaoNova: "planejada",
      autorNome: "Equipe da demonstração",
      registradoEm: new Date("2026-10-15T10:00:00.000Z"),
    },
    {
      obraId: ID_RECENTE,
      situacaoAnterior: "planejada",
      situacaoNova: "em_andamento",
      autorNome: "Analista Demo",
      registradoEm: new Date("2026-11-10T10:00:00.000Z"),
    },
    {
      obraId: ID_SEM_HISTORICO_EXTRA,
      situacaoAnterior: null,
      situacaoNova: "planejada",
      autorNome: "Equipe da demonstração",
      registradoEm: new Date("2026-11-05T10:00:00.000Z"),
    },
  ])
}

beforeEach(async () => {
  await limparTabelas(banco)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("listarObras (TI-15)", () => {
  it("devolve as obras da última atualização para a mais antiga, cada uma com o histórico do mais recente ao mais antigo", async () => {
    await gravarObrasComHistorico()

    const obras = await listarObras(banco)

    expect(obras.map(({ titulo }) => titulo)).toEqual([
      "DEMO - Recente",
      "DEMO - Do meio",
      "DEMO - Antiga",
    ])
    expect(
      obras[2].historico.map(({ situacaoAnterior, situacaoNova }) => [
        situacaoAnterior,
        situacaoNova,
      ])
    ).toEqual([
      ["planejada", "concluida"],
      [null, "planejada"],
    ])
  })

  it("monta os campos do contrato: ponto, valor em centavos, datas e etiqueta sintética", async () => {
    await gravarObrasComHistorico()

    const [recente] = await listarObras(banco)

    expect(recente).toEqual({
      id: ID_RECENTE,
      titulo: "DEMO - Recente",
      situacao: "em_andamento",
      descricao: null,
      categoria: "drenagem",
      secretaria: null,
      dataInicio: "2026-12-01",
      dataPrevista: "2027-03-31",
      valorPrevistoCentavos: 25_000_000,
      localizacao: { longitude: -40.14, latitude: -2.88 },
      estadoLocalizacao: "fora-da-cobertura",
      bairroId: null,
      proveniencia: "SINTETICO",
      atualizadoEm: "2026-11-10T10:00:00.000Z",
      historico: expect.any(Array),
    })
    expect(recente).not.toHaveProperty("criadoPor")
    expect(recente).not.toHaveProperty("atualizadoPor")
  })

  it("lê obras e histórico em duas consultas, não importa quantas obras há", async () => {
    await gravarObrasComHistorico()
    const consultas = jest.spyOn(banco.$client, "query")

    await listarObras(banco)

    expect(consultas).toHaveBeenCalledTimes(2)
  })

  it("devolve lista vazia com uma consulta só quando não há obra", async () => {
    const consultas = jest.spyOn(banco.$client, "query")

    expect(await listarObras(banco)).toEqual([])
    expect(consultas).toHaveBeenCalledTimes(1)
  })
})

describe("obterObra", () => {
  it("devolve a obra com o histórico e null quando não existe", async () => {
    await gravarObrasComHistorico()

    const encontrada = await obterObra(banco, ID_ANTIGA)
    const inexistente = await obterObra(
      banco,
      "99999999-9999-4999-8999-999999999999"
    )

    expect(encontrada?.historico).toHaveLength(2)
    expect(inexistente).toBeNull()
  })
})

describe("resumirObrasParaFontes (TI-15)", () => {
  it("dá a quantidade e a última atualização", async () => {
    await gravarObrasComHistorico()

    expect(await resumirObrasParaFontes(banco)).toEqual({
      quantidade: 3,
      ultimaAtualizacao: "2026-11-10T10:00:00.000Z",
    })
  })

  it("sem obras dá quantidade 0 e nenhuma data, nunca uma data inventada", async () => {
    expect(await resumirObrasParaFontes(banco)).toEqual({
      quantidade: 0,
      ultimaAtualizacao: null,
    })
  })
})
