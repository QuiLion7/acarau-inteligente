import { confirmarImportacao } from "@/lib/server/datasets/importacao-servico"
import {
  listarDatasets,
  listarDatasetsPublicados,
  lerSerieDaVersao,
  obterRelatorio,
  obterVersaoVisivel,
} from "@/lib/server/datasets/dataset-repositorio"
import { publicarVersao } from "@/lib/server/datasets/publicacao-servico"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"
import {
  bytesSinteticos,
  DADOS_DO_ROTEIRO,
  roteiroAlterado,
} from "@/test/importacao-teste"

const banco = criarBancoDeTeste()
const IMPORTADO_EM = new Date("2026-11-20T14:02:11.000Z")
const PUBLICADO_EM = new Date("2026-11-20T15:00:00.000Z")
const AUTOR = { usuario: "analista-teste", nome: "Analista Demo" }
const ID_INEXISTENTE = "7d0c2b8e-1f3a-4c55-9a0e-2d5b8f7c4e10"

function importarRoteiro(
  sobrescritas: {
    arquivo?: { nome: string; bytes: Uint8Array }
    destino?: (typeof DADOS_DO_ROTEIRO)["destino"]
    agora?: Date
  } = {}
) {
  return confirmarImportacao(banco, {
    arquivo: sobrescritas.arquivo ?? {
      nome: "roteiro.csv",
      bytes: bytesSinteticos("saude-roteiro_DEMO.csv"),
    },
    dados: {
      ...DADOS_DO_ROTEIRO,
      destino: sobrescritas.destino ?? DADOS_DO_ROTEIRO.destino,
    },
    autor: AUTOR,
    agora: sobrescritas.agora ?? IMPORTADO_EM,
  })
}

beforeEach(async () => {
  await limparTabelas(banco)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("nova versão e visibilidade (TI-05, CA-02.15)", () => {
  it("a nova versão nasce privada, o visitante segue na v1 e publicar a v2 despublica a v1 sem somar", async () => {
    const v1 = await importarRoteiro()
    await publicarVersao(banco, v1.versaoId, PUBLICADO_EM)
    const v2 = await importarRoteiro({
      arquivo: roteiroAlterado("roteiro-v2.csv", 43),
      destino: { tipo: "nova-versao", datasetId: v1.datasetId },
    })

    const antes = await obterVersaoVisivel(banco, {
      versaoId: null,
      papel: "visitante",
    })
    expect(antes).toMatchObject({
      status: "ok",
      versao: { id: v1.versaoId, numero: 1, situacao: "publicado" },
    })

    await publicarVersao(banco, v2.versaoId, PUBLICADO_EM)

    const depois = await obterVersaoVisivel(banco, {
      versaoId: null,
      papel: "visitante",
    })
    expect(depois).toMatchObject({
      status: "ok",
      versao: { id: v2.versaoId, numero: 2, situacao: "publicado" },
    })
    const serie = await lerSerieDaVersao(banco, v2.versaoId)
    expect(serie.valores["uv-10"]).toEqual({ "2025": 43, "2026": 51 })
    const [dataset] = await listarDatasets(banco)
    expect(
      dataset?.versoes.map(({ numero, situacao }) => [numero, situacao])
    ).toEqual([
      [2, "publicado"],
      [1, "privado"],
    ])
  })
})

describe("obterVersaoVisivel por papel (DV-25)", () => {
  it("sem nenhum dataset devolve nenhum-dataset a todos os papéis", async () => {
    for (const papel of ["visitante", "analista", "administrador"] as const) {
      expect(
        await obterVersaoVisivel(banco, { versaoId: null, papel })
      ).toEqual({ status: "nenhum-dataset" })
    }
  })

  it("visitante pedindo uma versão privada recebe o mesmo resultado de uma que não existe", async () => {
    const { versaoId } = await importarRoteiro()

    const privada = await obterVersaoVisivel(banco, {
      versaoId,
      papel: "visitante",
    })
    const inexistente = await obterVersaoVisivel(banco, {
      versaoId: ID_INEXISTENTE,
      papel: "visitante",
    })

    expect(privada).toEqual({ status: "nao-encontrada" })
    expect(privada).toEqual(inexistente)
  })

  it("visitante sem versão pedida e sem nenhuma publicada vê nenhum-dataset, mesmo havendo privada", async () => {
    await importarRoteiro()

    expect(
      await obterVersaoVisivel(banco, { versaoId: null, papel: "visitante" })
    ).toEqual({ status: "nenhum-dataset" })
  })

  it("analista e administrador leem a privada, pedida ou como padrão, com o dataset", async () => {
    const { versaoId } = await importarRoteiro()

    for (const papel of ["analista", "administrador"] as const) {
      const pedida = await obterVersaoVisivel(banco, { versaoId, papel })
      const padrao = await obterVersaoVisivel(banco, { versaoId: null, papel })

      expect(pedida).toMatchObject({
        status: "ok",
        versao: { id: versaoId, situacao: "privado" },
        dataset: { nome: "Roteiro 2025-2026", proveniencia: "SINTETICO" },
      })
      expect(padrao).toEqual(pedida)
    }
  })

  it("com o analista, a publicada vale como padrão mesmo havendo importação privada mais nova", async () => {
    const v1 = await importarRoteiro()
    await publicarVersao(banco, v1.versaoId, PUBLICADO_EM)
    await importarRoteiro({
      arquivo: roteiroAlterado("roteiro-v2.csv", 43),
      destino: { tipo: "nova-versao", datasetId: v1.datasetId },
      agora: new Date("2026-11-21T10:00:00.000Z"),
    })

    const resultado = await obterVersaoVisivel(banco, {
      versaoId: null,
      papel: "analista",
    })

    expect(resultado).toMatchObject({
      status: "ok",
      versao: { id: v1.versaoId },
    })
  })

  it("com mais de um publicado, o padrão é o publicado mais recentemente", async () => {
    const roteiro = await importarRoteiro()
    const outro = await importarRoteiro({
      arquivo: roteiroAlterado("outro.csv", 99),
      destino: { tipo: "novo" },
    })
    await publicarVersao(banco, roteiro.versaoId, PUBLICADO_EM)
    await publicarVersao(
      banco,
      outro.versaoId,
      new Date("2026-11-20T16:00:00.000Z")
    )

    const resultado = await obterVersaoVisivel(banco, {
      versaoId: null,
      papel: "visitante",
    })

    expect(resultado).toMatchObject({
      status: "ok",
      versao: { id: outro.versaoId },
    })
  })
})

describe("lerSerieDaVersao", () => {
  it("agrega por bairro e período, mantém o zero e separa o que ficou fora da cobertura", async () => {
    const { versaoId } = await importarRoteiro()

    const serie = await lerSerieDaVersao(banco, versaoId)

    expect(serie.periodos).toEqual(["2025", "2026"])
    expect(serie.valores["uv-10"]).toEqual({ "2025": 42, "2026": 51 })
    expect(serie.valores["uv-13"]).toEqual({ "2025": 9, "2026": 0 })
    expect(serie.valores["uv-20"]).toEqual({ "2025": 14, "2026": 11 })
    expect(serie.valores["uv-04"]).toBeUndefined()
    expect(serie.foraDaCobertura).toEqual({
      "2025": { casos: 6, localidades: 1 },
      "2026": { casos: 8, localidades: 1 },
    })
  })

  it("linha com casos vazio vira null, nunca zero, e não conta como localidade fora da cobertura", async () => {
    const texto = new TextDecoder()
      .decode(bytesSinteticos("saude-roteiro_DEMO.csv"))
      .replace("Centro;2025;42", "Centro;2025;")
      .replace("Aranaú;2026;8", "Aranaú;2026;")
    const { versaoId } = await importarRoteiro({
      arquivo: { nome: "vazios.csv", bytes: new TextEncoder().encode(texto) },
    })

    const serie = await lerSerieDaVersao(banco, versaoId)

    expect(serie.valores["uv-10"]).toEqual({ "2025": null, "2026": 51 })
    expect(serie.foraDaCobertura["2026"]).toBeUndefined()
    expect(serie.foraDaCobertura["2025"]).toEqual({ casos: 6, localidades: 1 })
  })

  it("versão inexistente devolve uma série vazia", async () => {
    expect(await lerSerieDaVersao(banco, ID_INEXISTENTE)).toEqual({
      periodos: [],
      valores: {},
      foraDaCobertura: {},
    })
  })
})

describe("listarDatasets, relatório e publicados (TI-12, CA-02.36)", () => {
  it("lista nome, indicador, versão, situação, autor, data, períodos e linhas, do mais recente ao mais antigo", async () => {
    const antigo = await importarRoteiro()
    await publicarVersao(banco, antigo.versaoId, PUBLICADO_EM)
    await importarRoteiro({
      arquivo: roteiroAlterado("v2.csv", 43),
      destino: { tipo: "nova-versao", datasetId: antigo.datasetId },
    })
    const recente = await importarRoteiro({
      arquivo: roteiroAlterado("outro.csv", 77),
      agora: new Date("2026-11-22T09:00:00.000Z"),
    })

    const lista = await listarDatasets(banco)

    expect(lista.map(({ id }) => id)).toEqual([
      recente.datasetId,
      antigo.datasetId,
    ])
    expect(lista[1]).toEqual({
      id: antigo.datasetId,
      nome: "Roteiro 2025-2026",
      indicador: "Casos notificados (sintético)",
      fonte: "Planilha de roteiro",
      unidade: "casos",
      proveniencia: "SINTETICO",
      preCarregado: false,
      versoes: [
        expect.objectContaining({
          numero: 2,
          situacao: "privado",
          publicadoEm: null,
        }),
        {
          id: antigo.versaoId,
          numero: 1,
          situacao: "publicado",
          autor: "Analista Demo",
          importadoEm: "2026-11-20T14:02:11.000Z",
          publicadoEm: "2026-11-20T15:00:00.000Z",
          granularidade: "ano",
          periodos: ["2025", "2026"],
          linhasGravadas: 16,
        },
      ],
    })
  })

  it("o relatório traz a versão, o dataset e o relatório de processamento validado", async () => {
    const { versaoId } = await importarRoteiro()

    const relatorio = await obterRelatorio(banco, versaoId)

    expect(relatorio).toMatchObject({
      versao: { id: versaoId, numero: 1, autor: "Analista Demo" },
      dataset: {
        nome: "Roteiro 2025-2026",
        indicador: "Casos notificados (sintético)",
      },
      relatorio: {
        nomeArquivo: "roteiro.csv",
        separador: ";",
        encoding: "UTF-8 com BOM",
        mapeamento: { bairro: "bairro", periodo: "ano", casos: "casos" },
        contagens: { lidas: 16, gravadas: 16, foraDaCobertura: 2 },
        granularidade: "ano",
        periodos: ["2025", "2026"],
      },
    })
    expect(await obterRelatorio(banco, ID_INEXISTENTE)).toBeNull()
  })

  it("lista só as versões publicadas, com o dataset", async () => {
    const publicada = await importarRoteiro()
    await importarRoteiro({ arquivo: roteiroAlterado("privado.csv", 5) })
    await publicarVersao(banco, publicada.versaoId, PUBLICADO_EM)

    const publicados = await listarDatasetsPublicados(banco)

    expect(publicados).toHaveLength(1)
    expect(publicados[0]).toMatchObject({
      dataset: { id: publicada.datasetId, nome: "Roteiro 2025-2026" },
      versao: { id: publicada.versaoId, situacao: "publicado" },
    })
  })
})
