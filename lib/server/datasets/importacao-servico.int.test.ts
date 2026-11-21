import { count, eq } from "drizzle-orm"

import { ErroApi } from "@/lib/server/http/erro-api"
import {
  buscarVersaoPorHash,
  type ReferenciaVersao,
} from "@/lib/server/datasets/dataset-repositorio"
import {
  confirmarImportacao,
  type EntradaConfirmacao,
} from "@/lib/server/datasets/importacao-servico"
import { dataset, datasetLinha, datasetVersao } from "@/lib/server/db/schema"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"
import { bytesSinteticos, DADOS_DO_ROTEIRO } from "@/test/importacao-teste"

// A busca por hash é o ponto onde a corrida da confirmação dupla se decide: o teste a faz "perder" a corrida de forma
// determinística. O banco é o real.
jest.mock("@/lib/server/datasets/dataset-repositorio", () => {
  const real = jest.requireActual("@/lib/server/datasets/dataset-repositorio")
  return { ...real, buscarVersaoPorHash: jest.fn(real.buscarVersaoPorHash) }
})

const banco = criarBancoDeTeste()
const AGORA = new Date("2026-11-20T14:02:11.000Z")
const AUTOR = { usuario: "analista-teste", nome: "Analista Demo" }

function entrada(
  sobrescritas: Partial<EntradaConfirmacao> = {}
): EntradaConfirmacao {
  return {
    arquivo: {
      nome: "roteiro.csv",
      bytes: bytesSinteticos("saude-roteiro_DEMO.csv"),
    },
    dados: DADOS_DO_ROTEIRO,
    autor: AUTOR,
    agora: AGORA,
    ...sobrescritas,
  }
}

// Outro conteúdo, mesmas colunas e mesmas decisões: serve de "arquivo alterado" para a nova versão.
function arquivoAlterado(): EntradaConfirmacao["arquivo"] {
  const texto = new TextDecoder().decode(
    bytesSinteticos("saude-roteiro_DEMO.csv")
  )
  return {
    nome: "roteiro-v2.csv",
    bytes: new TextEncoder().encode(
      texto.replace("Centro;2025;42", "Centro;2025;43")
    ),
  }
}

async function contar(
  tabela: typeof dataset | typeof datasetVersao | typeof datasetLinha
) {
  const [linha] = await banco.select({ total: count() }).from(tabela)
  return linha?.total ?? 0
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

describe("confirmarImportacao: nova versão (RF-02.22)", () => {
  it("grava a versão 2 no mesmo dataset, privada, com os metadados do dataset e a anterior intacta", async () => {
    const primeira = await confirmarImportacao(banco, entrada())

    const segunda = await confirmarImportacao(
      banco,
      entrada({
        arquivo: arquivoAlterado(),
        dados: {
          ...DADOS_DO_ROTEIRO,
          // Os metadados enviados valem só para dataset novo: aqui são ignorados.
          metadados: {
            nome: "Nome que deve ser ignorado",
            indicador: "Indicador ignorado",
            fonte: "Fonte ignorada",
          },
          destino: { tipo: "nova-versao", datasetId: primeira.datasetId },
        },
      })
    )

    expect(segunda).toMatchObject({
      datasetId: primeira.datasetId,
      numero: 2,
      linhasGravadas: 16,
    })
    expect(await contar(dataset)).toBe(1)
    const [conjunto] = await banco.select().from(dataset)
    expect(conjunto?.nome).toBe("Roteiro 2025-2026")
    const versoes = await banco
      .select()
      .from(datasetVersao)
      .orderBy(datasetVersao.numero)
    expect(versoes.map(({ numero, situacao }) => [numero, situacao])).toEqual([
      [1, "privado"],
      [2, "privado"],
    ])
    expect(await contar(datasetLinha)).toBe(32)
  })

  it("nova versão de um dataset que não existe é NAO_ENCONTRADO e não grava nada", async () => {
    const erro = await capturar(
      confirmarImportacao(
        banco,
        entrada({
          dados: {
            ...DADOS_DO_ROTEIRO,
            destino: {
              tipo: "nova-versao",
              datasetId: "7d0c2b8e-1f3a-4c55-9a0e-2d5b8f7c4e10",
            },
          },
        })
      )
    )

    expect(erro).toMatchObject({ code: "NAO_ENCONTRADO", status: 404 })
    expect([await contar(dataset), await contar(datasetVersao)]).toEqual([0, 0])
  })

  it("duas novas versões simultâneas do mesmo dataset recebem números diferentes (for update)", async () => {
    const { datasetId } = await confirmarImportacao(banco, entrada())
    const nova = (indice: number) => {
      const texto = new TextDecoder().decode(
        bytesSinteticos("saude-roteiro_DEMO.csv")
      )
      const bytes = new TextEncoder().encode(
        texto.replace("Centro;2025;42", `Centro;2025;${50 + indice}`)
      )
      return confirmarImportacao(
        banco,
        entrada({
          arquivo: { nome: `v${indice}.csv`, bytes },
          dados: {
            ...DADOS_DO_ROTEIRO,
            destino: { tipo: "nova-versao", datasetId },
          },
        })
      )
    }

    const gravadas = await Promise.all([nova(1), nova(2)])

    expect(gravadas.map(({ numero }) => numero).toSorted()).toEqual([2, 3])
  })
})

describe("confirmarImportacao: violação do índice único do hash (TI-03)", () => {
  it("perder a corrida vira CONTEUDO_JA_IMPORTADO com o dataset que ganhou, sem versão duplicada", async () => {
    const vencedora = await confirmarImportacao(banco, entrada())
    // A checagem prévia "não vê" a importação que a outra confirmação acabou de gravar; quem decide é o índice único.
    jest.mocked(buscarVersaoPorHash).mockResolvedValueOnce(null)

    const erro = await capturar(
      confirmarImportacao(
        banco,
        entrada({
          arquivo: {
            nome: "copia.csv",
            bytes: bytesSinteticos("saude-roteiro_DEMO.csv"),
          },
        })
      )
    )

    expect(erro).toMatchObject({
      code: "CONTEUDO_JA_IMPORTADO",
      status: 409,
      details: {
        datasetId: vencedora.datasetId,
        nome: "Roteiro 2025-2026",
        numero: 1,
      },
    })
    expect([await contar(dataset), await contar(datasetVersao)]).toEqual([1, 1])
  })

  it("sem encontrar o dataset depois da violação ainda responde CONTEUDO_JA_IMPORTADO, sem detalhes", async () => {
    await confirmarImportacao(banco, entrada())
    const nenhuma: ReferenciaVersao | null = null
    jest
      .mocked(buscarVersaoPorHash)
      .mockResolvedValueOnce(nenhuma)
      .mockResolvedValueOnce(nenhuma)

    const erro = await capturar(
      confirmarImportacao(
        banco,
        entrada({
          arquivo: {
            nome: "copia.csv",
            bytes: bytesSinteticos("saude-roteiro_DEMO.csv"),
          },
        })
      )
    )

    expect(erro).toMatchObject({
      code: "CONTEUDO_JA_IMPORTADO",
      details: undefined,
    })
  })
})

describe("confirmarImportacao: nome do arquivo e restrições do banco", () => {
  it("guarda no máximo 255 caracteres do nome do arquivo, sem perder a extensão na validação", async () => {
    const nomeLongo = `${"a".repeat(300)}.csv`

    await confirmarImportacao(
      banco,
      entrada({
        arquivo: {
          nome: nomeLongo,
          bytes: bytesSinteticos("saude-roteiro_DEMO.csv"),
        },
      })
    )

    const [versao] = await banco.select().from(datasetVersao)
    expect(versao?.nomeArquivo).toHaveLength(255)
  })

  it("o banco recusa dataset que não é sintético (última defesa de RN-02.02)", async () => {
    await expect(
      banco
        .insert(dataset)
        .values({ nome: "x", indicador: "x", fonte: "x", proveniencia: "REAL" })
    ).rejects.toThrow()
  })

  it("o banco recusa casos negativo e segunda versão publicada no mesmo dataset", async () => {
    const { datasetId, versaoId } = await confirmarImportacao(banco, entrada())
    await banco
      .update(datasetVersao)
      .set({ situacao: "publicado", publicadoEm: AGORA })
      .where(eq(datasetVersao.id, versaoId))
    const outra = await confirmarImportacao(
      banco,
      entrada({
        arquivo: arquivoAlterado(),
        dados: {
          ...DADOS_DO_ROTEIRO,
          destino: { tipo: "nova-versao", datasetId },
        },
      })
    )

    await expect(
      banco
        .update(datasetVersao)
        .set({ situacao: "publicado" })
        .where(eq(datasetVersao.id, outra.versaoId))
    ).rejects.toThrow()
    await expect(
      banco.insert(datasetLinha).values({
        versaoId,
        linhaArquivo: 99,
        bairroId: "uv-01",
        nomeOriginal: "x",
        periodo: "2030",
        casos: -1,
      })
    ).rejects.toThrow()
  })

  it("o banco recusa a mesma chave bairro e período duas vezes na mesma versão", async () => {
    const { versaoId } = await confirmarImportacao(banco, entrada())

    await expect(
      banco.insert(datasetLinha).values({
        versaoId,
        linhaArquivo: 99,
        bairroId: "uv-10",
        nomeOriginal: "Centro",
        periodo: "2025",
        casos: 1,
      })
    ).rejects.toThrow()
  })
})
