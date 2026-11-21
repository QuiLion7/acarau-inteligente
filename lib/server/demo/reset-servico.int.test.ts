import { count } from "drizzle-orm"

import { confirmarImportacao } from "@/lib/server/datasets/importacao-servico"
import { publicarVersao } from "@/lib/server/datasets/publicacao-servico"
import {
  listarDatasets,
  obterVersaoVisivel,
} from "@/lib/server/datasets/dataset-repositorio"
import { reiniciarDemonstracao } from "@/lib/server/demo/reset-servico"
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
