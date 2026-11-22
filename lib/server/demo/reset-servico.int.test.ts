import fsPromises from "node:fs/promises"

import { count } from "drizzle-orm"

import { confirmarImportacao } from "@/lib/server/datasets/importacao-servico"
import { publicarVersao } from "@/lib/server/datasets/publicacao-servico"
import {
  listarDatasets,
  obterVersaoVisivel,
} from "@/lib/server/datasets/dataset-repositorio"
import { reiniciarDemonstracao } from "@/lib/server/demo/reset-servico"
import {
  dataset,
  datasetLinha,
  datasetVersao,
  obra,
  obraHistorico,
} from "@/lib/server/db/schema"
import { listarObras } from "@/lib/server/obras/obra-repositorio"
import { criarObra, editarObra } from "@/lib/server/obras/obra-servico"
import { listarResumoBairros } from "@/lib/server/territorio/territorio-repositorio"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"
import { bytesSinteticos, DADOS_DO_ROTEIRO } from "@/test/importacao-teste"
import {
  contextoDeEscrita,
  entradaDeObra,
  pontoInteriorDoBairro,
} from "@/test/obras-teste"

const banco = criarBancoDeTeste()
const AGORA = new Date("2026-11-20T14:02:11.000Z")

async function contar(
  tabela: typeof dataset | typeof datasetVersao | typeof datasetLinha
) {
  const [linha] = await banco.select({ total: count() }).from(tabela)
  return linha?.total ?? 0
}

async function importarEPublicarRoteiro() {
  const { versaoId } = await confirmarImportacao(banco, {
    arquivo: {
      nome: "roteiro.csv",
      bytes: bytesSinteticos("saude-roteiro_DEMO.csv"),
    },
    dados: DADOS_DO_ROTEIRO,
    autor: { usuario: "analista-teste", nome: "Analista Demo" },
    agora: AGORA,
  })
  await publicarVersao(banco, versaoId, AGORA)
}

beforeEach(async () => {
  await limparTabelas(banco)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("reiniciarDemonstracao (TI-09, CA-02.29)", () => {
  it("apaga os datasets importados e deixa só o pré-carregado, publicado", async () => {
    await importarEPublicarRoteiro()
    expect(await contar(dataset)).toBe(1)

    const { datasetsRemovidos } = await reiniciarDemonstracao(banco, AGORA)

    expect(datasetsRemovidos).toBe(1)
    const lista = await listarDatasets(banco)
    expect(lista).toHaveLength(1)
    expect(lista[0]).toMatchObject({
      preCarregado: true,
      versoes: [{ numero: 1, situacao: "publicado" }],
    })
    expect(
      await obterVersaoVisivel(banco, { versaoId: null, papel: "visitante" })
    ).toMatchObject({ status: "ok", dataset: { preCarregado: true } })
  })

  it("repetir o reset dá o mesmo estado: um dataset, uma versão e 54 linhas", async () => {
    await reiniciarDemonstracao(banco, AGORA)
    const primeira = await reiniciarDemonstracao(banco, AGORA)

    expect(primeira.datasetsRemovidos).toBe(1)
    expect([
      await contar(dataset),
      await contar(datasetVersao),
      await contar(datasetLinha),
    ]).toEqual([1, 1, 54])
  })

  it("num banco vazio só recarrega o pré-carregado", async () => {
    const { datasetsRemovidos } = await reiniciarDemonstracao(banco, AGORA)

    expect(datasetsRemovidos).toBe(0)
    expect(await contar(dataset)).toBe(1)
  })

  it("o território não muda: os 24 bairros são os mesmos antes e depois", async () => {
    const antes = listarResumoBairros()
    await importarEPublicarRoteiro()

    await reiniciarDemonstracao(banco, AGORA)

    expect(listarResumoBairros()).toEqual(antes)
    expect(antes).toHaveLength(24)
  })

  it("o reimportar o mesmo arquivo depois do reset funciona, porque o hash antigo foi apagado", async () => {
    await importarEPublicarRoteiro()
    await reiniciarDemonstracao(banco, AGORA)

    await expect(importarEPublicarRoteiro()).resolves.toBeUndefined()

    expect(await contar(dataset)).toBe(2)
  })

  it("falha na recarga desfaz também a exclusão (tudo na mesma transação)", async () => {
    await importarEPublicarRoteiro()
    const original = process.cwd()
    jest.spyOn(process, "cwd").mockReturnValue("/pasta-que-nao-existe")

    await expect(reiniciarDemonstracao(banco, AGORA)).rejects.toThrow()

    jest.restoreAllMocks()
    expect(process.cwd()).toBe(original)
    expect(await contar(dataset)).toBe(1)
    const [versao] = await banco.select().from(datasetVersao)
    expect(versao?.nomeArquivo).toBe("roteiro.csv")
  })
})

describe("reiniciarDemonstracao com obras (TI-12, CA-04.18, PA-04.03)", () => {
  async function criarEEditarObras() {
    const criada = await criarObra(
      banco,
      entradaDeObra({ localizacao: pontoInteriorDoBairro("uv-10") }),
      contextoDeEscrita()
    )
    await criarObra(
      banco,
      entradaDeObra({ titulo: "DEMO - Outra" }),
      contextoDeEscrita()
    )
    await editarObra(
      banco,
      criada.id,
      entradaDeObra({ situacao: "concluida" }),
      contextoDeEscrita()
    )
  }

  // O id é sorteado a cada carga; todo o resto (campos, bairro, históricos e datas) tem de voltar igual.
  async function obrasSemId() {
    const obras = await listarObras(banco)
    return obras.map((obraLida) => ({ ...obraLida, id: "" }))
  }

  async function contarObrasEHistoricos() {
    const [obras] = await banco.select({ total: count() }).from(obra)
    const [entradas] = await banco
      .select({ total: count() })
      .from(obraHistorico)
    return [obras?.total, entradas?.total]
  }

  it("apaga as obras e os históricos criados e devolve as 8 de exemplo, com 14 entradas de histórico", async () => {
    await criarEEditarObras()
    expect(await contarObrasEHistoricos()).toEqual([2, 3])

    const { obrasRemovidas } = await reiniciarDemonstracao(banco, AGORA)

    expect(obrasRemovidas).toBe(2)
    expect(await contarObrasEHistoricos()).toEqual([8, 14])
    const titulos = (await listarObras(banco)).map(({ titulo }) => titulo)
    expect(titulos).not.toContain("DEMO - Outra")
    expect(titulos).toContain("DEMO - Requalificação de praça")
  })

  it("as obras voltam idênticas ao início, com históricos e datas, e repetir dá o mesmo estado", async () => {
    await reiniciarDemonstracao(banco, AGORA)
    const inicial = await obrasSemId()
    await criarEEditarObras()

    await reiniciarDemonstracao(banco, new Date("2026-12-31T00:00:00.000Z"))
    const primeira = await obrasSemId()
    await reiniciarDemonstracao(banco, AGORA)
    const segunda = await obrasSemId()

    expect(primeira).toEqual(inicial)
    expect(segunda).toEqual(inicial)
  })

  it("falha na carga das obras desfaz também a exclusão e a recarga dos datasets", async () => {
    await importarEPublicarRoteiro()
    await criarEEditarObras()
    const leituraReal = fsPromises.readFile
    jest.spyOn(fsPromises, "readFile").mockImplementation(((
      caminho: Parameters<typeof leituraReal>[0],
      ...resto: unknown[]
    ) => {
      if (String(caminho).endsWith("obras-pre-carregadas_DEMO.json")) {
        return Promise.reject(new Error("falha simulada"))
      }
      return (leituraReal as (...argumentos: unknown[]) => unknown)(
        caminho,
        ...resto
      )
    }) as typeof leituraReal)

    await expect(reiniciarDemonstracao(banco, AGORA)).rejects.toThrow(
      "falha simulada"
    )

    jest.restoreAllMocks()
    expect(await contarObrasEHistoricos()).toEqual([2, 3])
    const [versao] = await banco.select().from(datasetVersao)
    expect(versao?.nomeArquivo).toBe("roteiro.csv")
  })

  it("o território não muda com as obras: os 24 bairros são os mesmos", async () => {
    const antes = listarResumoBairros()

    await reiniciarDemonstracao(banco, AGORA)

    expect(listarResumoBairros()).toEqual(antes)
  })
})
