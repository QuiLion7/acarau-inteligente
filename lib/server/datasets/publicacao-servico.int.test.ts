import { eq } from "drizzle-orm"

import { ErroApi } from "@/lib/server/http/erro-api"
import { obterVersaoVisivel } from "@/lib/server/datasets/dataset-repositorio"
import { confirmarImportacao } from "@/lib/server/datasets/importacao-servico"
import {
  despublicarVersao,
  publicarVersao,
} from "@/lib/server/datasets/publicacao-servico"
import { datasetVersao } from "@/lib/server/db/schema"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"
import { DADOS_DO_ROTEIRO, roteiroAlterado } from "@/test/importacao-teste"

const banco = criarBancoDeTeste()
const IMPORTADO_EM = new Date("2026-11-20T14:02:11.000Z")
const PUBLICADO_EM = new Date("2026-11-20T15:00:00.000Z")
const OUTRO_INSTANTE = new Date("2026-11-20T18:30:00.000Z")
const ID_INEXISTENTE = "7d0c2b8e-1f3a-4c55-9a0e-2d5b8f7c4e10"

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
    agora: IMPORTADO_EM,
  })
}

async function situacoesDoDataset(datasetId: string) {
  const versoes = await banco
    .select()
    .from(datasetVersao)
    .where(eq(datasetVersao.datasetId, datasetId))
    .orderBy(datasetVersao.numero)
  return versoes.map(({ numero, situacao }) => [numero, situacao])
}

async function capturar(promessa: Promise<unknown>): Promise<ErroApi> {
  try {
    await promessa
  } catch (erro) {
    if (erro instanceof ErroApi) return erro
    throw erro
  }
  throw new Error("a chamada não lançou")
}

beforeEach(async () => {
  await limparTabelas(banco)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("publicarVersao (TI-06)", () => {
  it("publica a versão privada com a data da publicação", async () => {
    const { versaoId } = await importar("a.csv", 40)

    const versao = await publicarVersao(banco, versaoId, PUBLICADO_EM)

    expect(versao).toMatchObject({
      id: versaoId,
      situacao: "publicado",
      publicadoEm: "2026-11-20T15:00:00.000Z",
    })
  })

  it("publicar de novo devolve a mesma versão sem mudar a data nem as outras versões", async () => {
    const v1 = await importar("a.csv", 40)
    const primeira = await publicarVersao(banco, v1.versaoId, PUBLICADO_EM)

    const repetida = await publicarVersao(banco, v1.versaoId, OUTRO_INSTANTE)

    expect(repetida).toEqual(primeira)
    expect(repetida.publicadoEm).toBe("2026-11-20T15:00:00.000Z")
  })

  it("publicar a v2 despublica a v1 do mesmo dataset e não mexe em outro dataset", async () => {
    const v1 = await importar("a.csv", 40)
    const v2 = await importar("b.csv", 41, v1.datasetId)
    const outro = await importar("c.csv", 42)
    await publicarVersao(banco, outro.versaoId, PUBLICADO_EM)
    await publicarVersao(banco, v1.versaoId, PUBLICADO_EM)

    await publicarVersao(banco, v2.versaoId, OUTRO_INSTANTE)

    expect(await situacoesDoDataset(v1.datasetId)).toEqual([
      [1, "privado"],
      [2, "publicado"],
    ])
    expect(await situacoesDoDataset(outro.datasetId)).toEqual([
      [1, "publicado"],
    ])
  })

  it("duas publicações simultâneas de versões do mesmo dataset terminam com uma só publicada", async () => {
    const v1 = await importar("a.csv", 40)
    const v2 = await importar("b.csv", 41, v1.datasetId)

    await Promise.all([
      publicarVersao(banco, v1.versaoId, PUBLICADO_EM),
      publicarVersao(banco, v2.versaoId, OUTRO_INSTANTE),
    ])

    const situacoes = await situacoesDoDataset(v1.datasetId)
    expect(
      situacoes.filter(([, situacao]) => situacao === "publicado")
    ).toHaveLength(1)
  })

  it("versão inexistente é NAO_ENCONTRADO", async () => {
    const erro = await capturar(
      publicarVersao(banco, ID_INEXISTENTE, PUBLICADO_EM)
    )

    expect(erro).toMatchObject({ code: "NAO_ENCONTRADO", status: 404 })
  })
})

describe("despublicarVersao (TI-06, CA-02.17)", () => {
  it("volta a versão para privada, limpa a data e ela some para o visitante", async () => {
    const { versaoId } = await importar("a.csv", 40)
    await publicarVersao(banco, versaoId, PUBLICADO_EM)
    expect(
      await obterVersaoVisivel(banco, { versaoId, papel: "visitante" })
    ).toMatchObject({ status: "ok" })

    const versao = await despublicarVersao(banco, versaoId)

    expect(versao).toMatchObject({
      id: versaoId,
      situacao: "privado",
      publicadoEm: null,
    })
    expect(
      await obterVersaoVisivel(banco, { versaoId, papel: "visitante" })
    ).toEqual({ status: "nao-encontrada" })
    expect(
      await obterVersaoVisivel(banco, { versaoId: null, papel: "visitante" })
    ).toEqual({ status: "nenhum-dataset" })
  })

  it("despublicar uma versão privada devolve 200 sem mudança", async () => {
    const { versaoId } = await importar("a.csv", 40)

    const versao = await despublicarVersao(banco, versaoId)

    expect(versao).toMatchObject({ situacao: "privado", publicadoEm: null })
  })

  it("versão inexistente é NAO_ENCONTRADO", async () => {
    const erro = await capturar(despublicarVersao(banco, ID_INEXISTENTE))

    expect(erro).toMatchObject({ code: "NAO_ENCONTRADO", status: 404 })
  })
})
