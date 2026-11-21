import { count, eq } from "drizzle-orm"

import { analisarImportacao } from "@/lib/importacao/analisar-importacao"
import { lerArquivoCsv } from "@/lib/importacao/ler-arquivo-csv"
import { confirmarImportacao } from "@/lib/server/datasets/importacao-servico"
import { obterVersaoVisivel } from "@/lib/server/datasets/dataset-repositorio"
import {
  garantirDatasetPreCarregado,
  garantirPreCarregadoRegistrando,
} from "@/lib/server/demo/dataset-pre-carregado"
import { dataset, datasetLinha, datasetVersao } from "@/lib/server/db/schema"
import { listarResumoBairros } from "@/lib/server/territorio/territorio-repositorio"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"
import { bytesSinteticos, DADOS_DO_ROTEIRO } from "@/test/importacao-teste"

const banco = criarBancoDeTeste()
const AGORA = new Date("2026-11-20T14:02:11.000Z")

async function contar(
  tabela: typeof dataset | typeof datasetVersao | typeof datasetLinha
) {
  const [linha] = await banco.select({ total: count() }).from(tabela)
  return linha?.total ?? 0
}

beforeEach(async () => {
  await limparTabelas(banco)
  jest.spyOn(process.stdout, "write").mockImplementation(() => true)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("garantirDatasetPreCarregado (TI-10, CA-02.28)", () => {
  it("num banco vazio grava o dataset de exemplo publicado, marcado como pré-carregado, pelo autor da carga", async () => {
    const resultado = await garantirDatasetPreCarregado(banco, AGORA)

    expect(resultado).toBe("criado")
    const [conjunto] = await banco.select().from(dataset)
    expect(conjunto).toMatchObject({
      nome: "Casos de saúde 2024-2026 (exemplo)",
      proveniencia: "SINTETICO",
      unidade: "casos",
      preCarregado: true,
    })
    const [versao] = await banco.select().from(datasetVersao)
    expect(versao).toMatchObject({
      numero: 1,
      situacao: "publicado",
      publicadoEm: AGORA,
      autorUsuario: "sistema",
      autorNome: "Carga da demonstração",
      granularidade: "ano",
      periodos: ["2024", "2025", "2026"],
      linhasGravadas: 54,
    })
    expect(await contar(datasetLinha)).toBe(54)
  })

  it("o visitante vê o pré-carregado publicado, com um bairro com zero e outros sem nenhuma linha", async () => {
    await garantirDatasetPreCarregado(banco, AGORA)

    const resultado = await obterVersaoVisivel(banco, {
      versaoId: null,
      papel: "visitante",
    })

    expect(resultado).toMatchObject({
      status: "ok",
      dataset: { preCarregado: true },
      versao: { situacao: "publicado" },
    })
    const linhas = await banco.select().from(datasetLinha)
    expect(linhas.filter(({ casos }) => casos === 0)).toHaveLength(1)
    const comLinha = new Set(linhas.map(({ bairroId }) => bairroId))
    expect(
      listarResumoBairros().filter(({ id }) => !comLinha.has(id)).length
    ).toBe(6)
  })

  it("é idempotente: a segunda chamada devolve existente e não duplica dataset, versão nem linhas", async () => {
    await garantirDatasetPreCarregado(banco, AGORA)

    const segunda = await garantirDatasetPreCarregado(banco, AGORA)

    expect(segunda).toBe("existente")
    expect([
      await contar(dataset),
      await contar(datasetVersao),
      await contar(datasetLinha),
    ]).toEqual([1, 1, 54])
  })

  it("chamadas simultâneas gravam uma versão só", async () => {
    const resultados = await Promise.all([
      garantirDatasetPreCarregado(banco, AGORA),
      garantirDatasetPreCarregado(banco, AGORA),
    ])

    expect(resultados.toSorted()).toEqual(["criado", "existente"])
    expect(await contar(datasetVersao)).toBe(1)
  })

  it("não toca nos datasets que o analista importou, que ficam privados", async () => {
    const { datasetId } = await confirmarImportacao(banco, {
      arquivo: {
        nome: "roteiro.csv",
        bytes: bytesSinteticos("saude-roteiro_DEMO.csv"),
      },
      dados: DADOS_DO_ROTEIRO,
      autor: { usuario: "analista-teste", nome: "Analista Demo" },
      agora: AGORA,
    })

    await garantirDatasetPreCarregado(banco, AGORA)

    expect(await contar(dataset)).toBe(2)
    const [roteiro] = await banco
      .select()
      .from(datasetVersao)
      .where(eq(datasetVersao.datasetId, datasetId))
    expect(roteiro?.situacao).toBe("privado")
  })

  it("o CSV de exemplo passa no motor sem nenhuma decisão, como a carga exige", () => {
    const leitura = lerArquivoCsv({
      nome: "saude-pre-carregado_DEMO.csv",
      bytes: bytesSinteticos("saude-pre-carregado_DEMO.csv"),
    })
    if (leitura.status !== "lido") throw new Error(leitura.motivo)

    const analise = analisarImportacao({
      arquivo: leitura.arquivo,
      mapeamento: null,
      decisoes: [],
      bairros: listarResumoBairros(),
    })

    expect(analise.podeConfirmar).toBe(true)
  })
})

describe("garantirPreCarregadoRegistrando", () => {
  it("registra demo.pre_carregado com o resultado, criado e depois existente", async () => {
    const escrita = jest.spyOn(process.stdout, "write")
    await garantirPreCarregadoRegistrando(banco, AGORA)
    await garantirPreCarregadoRegistrando(banco, AGORA)

    const eventos = escrita.mock.calls.map(([linha]) =>
      JSON.parse(String(linha))
    )
    expect(eventos.map(({ evento, resultado }) => [evento, resultado])).toEqual(
      [
        ["demo.pre_carregado", "criado"],
        ["demo.pre_carregado", "existente"],
      ]
    )
  })

  it("quando o mesmo conteúdo já foi importado por um analista, a falha é registrada e não lançada, e nada é gravado", async () => {
    await confirmarImportacao(banco, {
      arquivo: {
        nome: "copia.csv",
        bytes: bytesSinteticos("saude-pre-carregado_DEMO.csv"),
      },
      dados: {
        ...DADOS_DO_ROTEIRO,
        decisoes: [],
      },
      autor: { usuario: "analista-teste", nome: "Analista Demo" },
      agora: AGORA,
    })
    const escrita = jest.spyOn(process.stdout, "write")

    await expect(
      garantirPreCarregadoRegistrando(banco, AGORA)
    ).resolves.toBeUndefined()

    const [evento] = escrita.mock.calls.map(([linha]) =>
      JSON.parse(String(linha))
    )
    expect(evento).toMatchObject({
      nivel: "error",
      evento: "demo.pre_carregado",
    })
    expect(await contar(dataset)).toBe(1)
  })
})
