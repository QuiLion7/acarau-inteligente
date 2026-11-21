import { montarAnaliseDataset } from "@/lib/server/datasets/analise-dataset-servico"
import { confirmarImportacao } from "@/lib/server/datasets/importacao-servico"
import { publicarVersao } from "@/lib/server/datasets/publicacao-servico"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"
import { DADOS_DO_ROTEIRO, roteiroAlterado } from "@/test/importacao-teste"

const banco = criarBancoDeTeste()
const AGORA = new Date("2026-11-20T14:02:11.000Z")

function importar(nome: string, casosDoCentro: number, datasetId?: string) {
  return confirmarImportacao(banco, {
    arquivo: roteiroAlterado(nome, casosDoCentro),
    dados: {
      ...DADOS_DO_ROTEIRO,
      destino: datasetId
        ? { tipo: "nova-versao", datasetId }
        : DADOS_DO_ROTEIRO.destino,
    },
    autor: { usuario: "analista-teste", nome: "Analista Demo" },
    agora: AGORA,
  })
}

// v1 publicada e v2 privada do mesmo dataset: o caso do CA-02.15.
async function prepararV1PublicadaEV2Privada() {
  const v1 = await importar("a.csv", 40)
  await publicarVersao(banco, v1.versaoId, AGORA)
  const v2 = await importar("b.csv", 43, v1.datasetId)
  return { v1, v2 }
}

beforeEach(async () => {
  await limparTabelas(banco)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("montarAnaliseDataset", () => {
  it("sem nenhum dataset devolve nenhum-dataset", async () => {
    expect(
      await montarAnaliseDataset(banco, { versaoId: null, papel: "analista" })
    ).toEqual({ status: "nenhum-dataset" })
  })

  it("o visitante recebe a versão publicada com a série, só as opções publicadas e sem poder gerenciar", async () => {
    const { v1 } = await prepararV1PublicadaEV2Privada()

    const resultado = await montarAnaliseDataset(banco, {
      versaoId: null,
      papel: "visitante",
    })

    if (resultado.status !== "ok") throw new Error(resultado.status)
    const { analise } = resultado
    expect(analise.versao).toMatchObject({
      id: v1.versaoId,
      numero: 1,
      situacao: "publicado",
    })
    expect(analise.dataset).toEqual({
      nome: "Roteiro 2025-2026",
      indicador: "Casos notificados (sintético)",
      fonte: "Planilha de roteiro",
      unidade: "casos",
      proveniencia: "SINTETICO",
    })
    expect(analise.periodos).toEqual(["2025", "2026"])
    expect(analise.valores["uv-10"]).toEqual({ "2025": 40, "2026": 51 })
    expect(analise.opcoes).toEqual([
      {
        id: v1.versaoId,
        rotulo: "Roteiro 2025-2026, versão 1",
        situacao: "publicado",
      },
    ])
    expect(analise.podeGerenciar).toBe(false)
  })

  it("o visitante que pede a versão privada recebe nao-encontrada, sem nenhum dado dela", async () => {
    const { v2 } = await prepararV1PublicadaEV2Privada()

    const resultado = await montarAnaliseDataset(banco, {
      versaoId: v2.versaoId,
      papel: "visitante",
    })

    expect(resultado).toEqual({ status: "nao-encontrada" })
  })

  it("o analista abre a versão privada, vê todas as opções (publicada primeiro) e pode gerenciar", async () => {
    const { v1, v2 } = await prepararV1PublicadaEV2Privada()

    const resultado = await montarAnaliseDataset(banco, {
      versaoId: v2.versaoId,
      papel: "analista",
    })

    if (resultado.status !== "ok") throw new Error(resultado.status)
    expect(resultado.analise.versao).toMatchObject({
      id: v2.versaoId,
      situacao: "privado",
    })
    expect(resultado.analise.valores["uv-10"]).toEqual({
      "2025": 43,
      "2026": 51,
    })
    expect(
      resultado.analise.opcoes.map(({ id, situacao }) => [id, situacao])
    ).toEqual([
      [v1.versaoId, "publicado"],
      [v2.versaoId, "privado"],
    ])
    expect(resultado.analise.podeGerenciar).toBe(true)
  })

  it("versão que não existe é nao-encontrada para qualquer papel", async () => {
    await prepararV1PublicadaEV2Privada()
    const inexistente = "7d0c2b8e-1f3a-4c55-9a0e-2d5b8f7c4e10"

    for (const papel of ["visitante", "analista"] as const) {
      expect(
        await montarAnaliseDataset(banco, { versaoId: inexistente, papel })
      ).toEqual({ status: "nao-encontrada" })
    }
  })
})
