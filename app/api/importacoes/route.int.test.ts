import { createHash } from "node:crypto"

import { count, eq } from "drizzle-orm"

import { POST } from "@/app/api/importacoes/route"
import { relatorioImportacaoSchema } from "@/lib/importacao/relatorio-schema"
import { lerAmbiente, type Ambiente } from "@/lib/config/ambiente"
import { gravarLinhasEmLotes } from "@/lib/server/datasets/dataset-linha-repositorio"
import { obterBanco } from "@/lib/server/db/cliente"
import { dataset, datasetLinha, datasetVersao } from "@/lib/server/db/schema"
import {
  criarAmbienteDeTeste,
  USUARIO_ADMIN,
  USUARIO_ANALISTA,
} from "@/test/ambiente-teste"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"
import {
  bytesSinteticos,
  DADOS_DO_ROTEIRO,
  requisicaoDeImportacao,
  tokenDoUsuario,
} from "@/test/importacao-teste"

jest.mock("@/lib/server/db/cliente", () => ({
  ...jest.requireActual("@/lib/server/db/cliente"),
  obterBanco: jest.fn(),
}))
jest.mock("@/lib/config/ambiente", () => ({
  ...jest.requireActual("@/lib/config/ambiente"),
  lerAmbiente: jest.fn(),
}))
// Ponto de injeção de falha (TI-02): por padrão grava de verdade; o teste faz uma chamada falhar no meio do lote.
jest.mock("@/lib/server/datasets/dataset-linha-repositorio", () => {
  const real = jest.requireActual(
    "@/lib/server/datasets/dataset-linha-repositorio"
  )
  return { ...real, gravarLinhasEmLotes: jest.fn(real.gravarLinhasEmLotes) }
})

const banco = criarBancoDeTeste()
let ambiente: Ambiente
let token: string
let escrita: jest.SpyInstance

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex")
}

async function contar(
  tabela: typeof dataset | typeof datasetVersao | typeof datasetLinha
) {
  const [linha] = await banco.select({ total: count() }).from(tabela)
  return linha?.total ?? 0
}

function logsEmTexto(): string {
  return escrita.mock.calls.map(([linha]) => String(linha)).join("")
}

beforeAll(async () => {
  ambiente = await criarAmbienteDeTeste()
})

beforeEach(async () => {
  jest.mocked(obterBanco).mockReturnValue(banco)
  jest.mocked(lerAmbiente).mockReturnValue(ambiente)
  escrita = jest.spyOn(process.stdout, "write").mockImplementation(() => true)
  await limparTabelas(banco)
  token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("POST /api/importacoes: confirma o roteiro (TI-01)", () => {
  it("grava dataset sintético, versão privada, as linhas e o relatório completo", async () => {
    const resposta = await POST(await requisicaoDeImportacao({ token }))
    const corpo = await resposta.json()

    expect(resposta.status).toBe(201)
    expect(corpo).toEqual({
      datasetId: expect.any(String),
      versaoId: expect.any(String),
      numero: 1,
    })
    const [conjunto] = await banco.select().from(dataset)
    expect(conjunto).toMatchObject({
      id: corpo.datasetId,
      nome: "Roteiro 2025-2026",
      indicador: "Casos notificados (sintético)",
      fonte: "Planilha de roteiro",
      unidade: "casos",
      proveniencia: "SINTETICO",
      preCarregado: false,
    })
    const [versao] = await banco.select().from(datasetVersao)
    expect(versao).toMatchObject({
      id: corpo.versaoId,
      datasetId: corpo.datasetId,
      numero: 1,
      situacao: "privado",
      granularidade: "ano",
      periodos: ["2025", "2026"],
      hashConteudo: sha256(bytesSinteticos("saude-roteiro_DEMO.csv")),
      nomeArquivo: "saude-roteiro_DEMO.csv",
      autorUsuario: USUARIO_ANALISTA,
      autorNome: "Analista Demo",
      linhasGravadas: 16,
      publicadoEm: null,
    })
  })

  it("as linhas de Aranaú ficam sem bairro, com o nome original, e o zero explícito segue zero", async () => {
    await POST(await requisicaoDeImportacao({ token }))

    const linhas = await banco
      .select()
      .from(datasetLinha)
      .orderBy(datasetLinha.linhaArquivo)

    expect(linhas).toHaveLength(16)
    const foraDaCobertura = linhas.filter(({ bairroId }) => bairroId === null)
    expect(
      foraDaCobertura.map(({ nomeOriginal, periodo }) => [
        nomeOriginal,
        periodo,
      ])
    ).toEqual([
      ["Aranaú", "2025"],
      ["Aranaú", "2026"],
    ])
    expect(
      linhas.find(({ nomeOriginal }) => nomeOriginal === "rodagem")
    ).toMatchObject({
      bairroId: "uv-13",
      periodo: "2026",
      casos: 0,
    })
    expect(
      linhas.find(({ nomeOriginal }) => nomeOriginal === "  centro ")
    ).toMatchObject({
      bairroId: "uv-10",
      periodo: "2026",
      casos: 51,
    })
    expect(
      linhas
        .filter(({ nomeOriginal }) => nomeOriginal === "Morada")
        .map(({ bairroId }) => bairroId)
    ).toEqual(["uv-20", "uv-20"])
  })

  it("o relatório traz o arquivo, as colunas, as decisões e as contagens, e passa no schema", async () => {
    await POST(await requisicaoDeImportacao({ token }))

    const [versao] = await banco.select().from(datasetVersao)
    const relatorio = relatorioImportacaoSchema.parse(versao?.relatorio)
    expect(relatorio).toMatchObject({
      nomeArquivo: "saude-roteiro_DEMO.csv",
      hashConteudo: sha256(bytesSinteticos("saude-roteiro_DEMO.csv")),
      separador: ";",
      encoding: "UTF-8 com BOM",
      mapeamento: { bairro: "bairro", periodo: "ano", casos: "casos" },
      colunasIgnoradas: [],
      contagens: {
        lidas: 16,
        gravadas: 16,
        semDado: 0,
        foraDaCobertura: 2,
        avisos: 0,
      },
      granularidade: "ano",
      periodos: ["2025", "2026"],
    })
    expect(relatorio.decisoesBairro).toEqual(
      expect.arrayContaining([
        {
          nomeOriginal: "SAO BENEDITO",
          destino: { tipo: "bairro", bairroId: "uv-03", nome: "São Benedito" },
          origem: "automatica",
          linhas: 2,
        },
        {
          nomeOriginal: "Morada",
          destino: {
            tipo: "bairro",
            bairroId: "uv-20",
            nome: "Morada dos Ventos",
          },
          origem: "manual",
          linhas: 2,
        },
        {
          nomeOriginal: "Aranaú",
          destino: { tipo: "fora-da-cobertura" },
          origem: "manual",
          linhas: 2,
        },
      ])
    )
  })

  it("o administrador também importa", async () => {
    const tokenAdmin = await tokenDoUsuario(USUARIO_ADMIN, ambiente)

    const resposta = await POST(
      await requisicaoDeImportacao({ token: tokenAdmin })
    )

    expect(resposta.status).toBe(201)
  })

  it("registra importacao.confirmada com o usuário e sem o conteúdo do arquivo", async () => {
    await POST(await requisicaoDeImportacao({ token }))

    const eventos = escrita.mock.calls.map(([linha]) =>
      JSON.parse(String(linha))
    )
    const confirmada = eventos.find(
      ({ evento }) => evento === "importacao.confirmada"
    )
    expect(confirmada).toMatchObject({
      nivel: "info",
      usuario: USUARIO_ANALISTA,
      numero: 1,
      linhas: 16,
      duracaoMs: expect.any(Number),
    })
    expect(logsEmTexto()).not.toMatch(/Aranaú|saude-roteiro|Morada/)
  })
})

describe("POST /api/importacoes: falha no meio da gravação (TI-02)", () => {
  it("desfaz tudo, responde 500 sem detalhe e a nova tentativa grava", async () => {
    jest
      .mocked(gravarLinhasEmLotes)
      .mockImplementationOnce(async (transacao, versaoId, linhas) => {
        const real = jest.requireActual(
          "@/lib/server/datasets/dataset-linha-repositorio"
        )
        await real.gravarLinhasEmLotes(transacao, versaoId, linhas.slice(0, 5))
        throw new Error("falha forçada no meio do lote")
      })

    const falha = await POST(await requisicaoDeImportacao({ token }))
    const corpo = await falha.json()

    expect(falha.status).toBe(500)
    expect(corpo).toEqual({
      code: "ERRO_INTERNO",
      message: "Ocorreu um erro inesperado. Tente novamente em instantes.",
      requestId: falha.headers.get("x-request-id"),
    })
    expect(JSON.stringify(corpo)).not.toContain("forçada")
    expect([
      await contar(dataset),
      await contar(datasetVersao),
      await contar(datasetLinha),
    ]).toEqual([0, 0, 0])

    const nova = await POST(await requisicaoDeImportacao({ token }))

    expect(nova.status).toBe(201)
    expect(await contar(datasetLinha)).toBe(16)
  })
})

describe("POST /api/importacoes: confirmação dupla (TI-03)", () => {
  it("duas confirmações simultâneas geram um dataset e um CONTEUDO_JA_IMPORTADO", async () => {
    const [primeira, segunda] = await Promise.all([
      requisicaoDeImportacao({ token }).then(POST),
      requisicaoDeImportacao({ token }).then(POST),
    ])

    expect([primeira.status, segunda.status].toSorted()).toEqual([201, 409])
    const recusada = primeira.status === 409 ? primeira : segunda
    expect(await recusada.json()).toMatchObject({
      code: "CONTEUDO_JA_IMPORTADO",
    })
    expect([await contar(dataset), await contar(datasetVersao)]).toEqual([1, 1])
    expect(await contar(datasetLinha)).toBe(16)
  })
})

describe("POST /api/importacoes: mesmo conteúdo com outro nome (TI-04)", () => {
  it("a segunda confirmação dá 409 com o dataset que já tem o conteúdo", async () => {
    const primeira = await (
      await POST(await requisicaoDeImportacao({ token }))
    ).json()
    const renomeado = {
      nome: "outro-nome.csv",
      bytes: bytesSinteticos("saude-roteiro_DEMO.csv"),
    }

    const resposta = await POST(
      await requisicaoDeImportacao({ token, arquivo: renomeado })
    )
    const corpo = await resposta.json()

    expect(resposta.status).toBe(409)
    expect(corpo).toMatchObject({
      code: "CONTEUDO_JA_IMPORTADO",
      message:
        "Este arquivo já foi importado no dataset Roteiro 2025-2026 (versão 1).",
      details: {
        datasetId: primeira.datasetId,
        nome: "Roteiro 2025-2026",
        numero: 1,
      },
    })
    expect(await contar(dataset)).toBe(1)
    expect(await contar(datasetVersao)).toBe(1)
  })

  it("registra importacao.duplicada com o dataset e sem o nome do arquivo", async () => {
    await POST(await requisicaoDeImportacao({ token }))
    escrita.mockClear()

    await POST(
      await requisicaoDeImportacao({
        token,
        arquivo: {
          nome: "copia-secreta.csv",
          bytes: bytesSinteticos("saude-roteiro_DEMO.csv"),
        },
      })
    )

    const [duplicada] = escrita.mock.calls.map(([linha]) =>
      JSON.parse(String(linha))
    )
    expect(duplicada).toMatchObject({
      evento: "importacao.duplicada",
      usuario: USUARIO_ANALISTA,
    })
    expect(logsEmTexto()).not.toContain("copia-secreta")
  })
})

describe("POST /api/importacoes: acesso (TI-07, parte)", () => {
  it.each([
    ["sem cookie", undefined],
    ["com token desconhecido", "token-inventado"],
  ])(
    "%s responde 401 NAO_AUTENTICADO sem dado no corpo",
    async (_, tokenRecebido) => {
      const resposta = await POST(
        await requisicaoDeImportacao({ token: tokenRecebido })
      )

      expect(resposta.status).toBe(401)
      expect(await resposta.json()).toEqual({
        code: "NAO_AUTENTICADO",
        message: "Entre para acessar esta área.",
        requestId: resposta.headers.get("x-request-id"),
      })
      expect(await contar(dataset)).toBe(0)
    }
  )

  it.each([
    ["de outro site", "https://outro-site.exemplo"],
    ["ausente", null],
  ])(
    "Origin %s responde 403 ORIGEM_INVALIDA e não grava",
    async (_, origem) => {
      const resposta = await POST(
        await requisicaoDeImportacao({ token, origem })
      )

      expect(resposta.status).toBe(403)
      expect(await resposta.json()).toEqual({
        code: "ORIGEM_INVALIDA",
        message: "A origem da requisição não é permitida.",
        requestId: resposta.headers.get("x-request-id"),
      })
      expect(await contar(dataset)).toBe(0)
    }
  )
})

describe("POST /api/importacoes: o servidor roda o motor de novo (TI-08)", () => {
  it("recusa decisão pendente com 422 e a contagem de pendências", async () => {
    const resposta = await POST(
      await requisicaoDeImportacao({
        token,
        dados: { ...DADOS_DO_ROTEIRO, decisoes: [] },
      })
    )
    const corpo = await resposta.json()

    expect(resposta.status).toBe(422)
    expect(corpo).toMatchObject({
      code: "IMPORTACAO_INVALIDA",
      details: { problemas: [], pendencias: 2 },
    })
    expect(await contar(dataset)).toBe(0)
  })

  it("recusa o arquivo com erro de linha, mesmo que o cliente tenha enviado como confirmável", async () => {
    const resposta = await POST(
      await requisicaoDeImportacao({
        token,
        arquivo: {
          nome: "duplicata.csv",
          bytes: bytesSinteticos("adversos/duplicata_DEMO.csv"),
        },
        dados: { ...DADOS_DO_ROTEIRO, separador: "," },
      })
    )
    const corpo = await resposta.json()

    expect(resposta.status).toBe(422)
    expect(corpo.details.problemas).toEqual([
      { linhas: [2, 3], codigo: "DUPLICATA", severidade: "erro" },
    ])
    expect(await contar(dataset)).toBe(0)
  })

  it("recusa o Content-Length acima do limite com 413, antes de ler o corpo", async () => {
    const resposta = await POST(
      await requisicaoDeImportacao({ token, contentLength: 6 * 1024 * 1024 })
    )

    expect(resposta.status).toBe(413)
    expect(await resposta.json()).toMatchObject({
      code: "ARQUIVO_GRANDE_DEMAIS",
    })
    expect(await contar(dataset)).toBe(0)
  })

  it("recusa o arquivo acima do limite mesmo com o Content-Length dentro da margem", async () => {
    const grande = new Uint8Array(5 * 1024 * 1024 + 1).fill(0x61)

    const resposta = await POST(
      await requisicaoDeImportacao({
        token,
        arquivo: { nome: "grande.csv", bytes: grande },
      })
    )

    expect(resposta.status).toBe(413)
  })

  it("recusa dado pessoal em coluna com 422, e o log não traz o nome da coluna nem o valor", async () => {
    const resposta = await POST(
      await requisicaoDeImportacao({
        token,
        arquivo: {
          nome: "paciente.csv",
          bytes: bytesSinteticos("adversos/dado-pessoal-coluna_DEMO.csv"),
        },
        dados: { ...DADOS_DO_ROTEIRO, separador: "," },
      })
    )

    expect(resposta.status).toBe(422)
    expect(await resposta.json()).toMatchObject({
      code: "IMPORTACAO_INVALIDA",
      details: {
        recusa: { motivo: "DADO_PESSOAL_COLUNA", coluna: "nome_paciente" },
      },
    })
    const eventos = escrita.mock.calls.map(([linha]) =>
      JSON.parse(String(linha))
    )
    expect(
      eventos.find(({ evento }) => evento === "importacao.recusada")
    ).toMatchObject({
      nivel: "warn",
      codigo: "DADO_PESSOAL_COLUNA",
      usuario: USUARIO_ANALISTA,
    })
    expect(logsEmTexto()).not.toMatch(/nome_paciente|Fulano|paciente\.csv/)
    expect(await contar(dataset)).toBe(0)
  })

  it("recusa CPF em célula com 422 na linha certa, e o log não traz o valor", async () => {
    const resposta = await POST(
      await requisicaoDeImportacao({
        token,
        arquivo: {
          nome: "cpf.csv",
          bytes: bytesSinteticos("adversos/dado-pessoal-cpf_DEMO.csv"),
        },
        dados: { ...DADOS_DO_ROTEIRO, separador: "," },
      })
    )
    const texto = await resposta.text()

    expect(resposta.status).toBe(422)
    expect(JSON.parse(texto).details).toEqual({
      recusa: { motivo: "DADO_PESSOAL_VALOR", linha: 3 },
    })
    expect(texto).not.toContain("123.456")
    const recusada = escrita.mock.calls
      .map(([linha]) => JSON.parse(String(linha)))
      .find(({ evento }) => evento === "importacao.recusada")
    expect(recusada).toMatchObject({ codigo: "DADO_PESSOAL_VALOR", linha: 3 })
    expect(logsEmTexto()).not.toContain("123.456")
  })

  it("recusa CSV malformado com o motivo e a linha", async () => {
    const resposta = await POST(
      await requisicaoDeImportacao({
        token,
        arquivo: {
          nome: "aspas.csv",
          bytes: bytesSinteticos("adversos/aspas-nao-fechadas_DEMO.csv"),
        },
        dados: { ...DADOS_DO_ROTEIRO, separador: "," },
      })
    )

    expect(resposta.status).toBe(422)
    expect(await resposta.json()).toMatchObject({
      details: { recusa: { motivo: "ASPAS_NAO_FECHADAS", linha: 3 } },
    })
  })
})

describe("POST /api/importacoes: validação do envio", () => {
  it.each([
    ["sem Content-Length", { contentLength: null }, "content-length"],
    ["sem arquivo", { arquivo: null }, "arquivo"],
    ["dados que não são JSON", { dados: "{não é json" }, "dados"],
    [
      "dados com campo inválido",
      {
        dados: {
          ...DADOS_DO_ROTEIRO,
          metadados: { ...DADOS_DO_ROTEIRO.metadados, nome: "ab" },
        },
      },
      "metadados.nome",
    ],
    [
      "corpo que não é multipart",
      { corpoBruto: "isto não é multipart" },
      "corpo",
    ],
  ])(
    "%s responde 400 VALIDACAO com o campo, sem eco do valor",
    async (_, opcoes, campo) => {
      const resposta = await POST(
        await requisicaoDeImportacao({ token, ...opcoes })
      )
      const texto = await resposta.text()

      expect(resposta.status).toBe(400)
      expect(JSON.parse(texto)).toMatchObject({
        code: "VALIDACAO",
        details: { campos: { [campo]: expect.any(String) } },
      })
      expect(texto).not.toContain("não é json")
      expect(await contar(dataset)).toBe(0)
    }
  )
})

describe("POST /api/importacoes: tamanho máximo (TI-11)", () => {
  it("grava 10.000 linhas num arquivo de cerca de 5 MB e registra o tempo", async () => {
    const bairros = [
      "Centro",
      "Rodagem",
      "Piranhas",
      "Mucunã",
      "Pedrinhas",
      "Saguim",
      "Bailarina",
      "Perseguida",
    ]
    const preenchimento = "x".repeat(480)
    const linhas = Array.from({ length: 10_000 }, (_, i) => {
      const mes = String((i % 12) + 1).padStart(2, "0")
      const ano = 1900 + Math.floor(i / (12 * bairros.length))
      return `${bairros[Math.floor(i / 12) % bairros.length]},${ano}-${mes},${i % 97},${preenchimento}`
    })
    const bytes = new TextEncoder().encode(
      ["bairro,ano,casos,observacao", ...linhas].join("\n")
    )
    expect(bytes.length).toBeGreaterThan(4.5 * 1024 * 1024)
    expect(bytes.length).toBeLessThanOrEqual(5 * 1024 * 1024)

    const inicio = performance.now()
    const resposta = await POST(
      await requisicaoDeImportacao({
        token,
        arquivo: { nome: "cinco-mb.csv", bytes },
        dados: { ...DADOS_DO_ROTEIRO, separador: ",", decisoes: [] },
      })
    )
    const duracaoMs = Math.round(performance.now() - inicio)

    expect(resposta.status).toBe(201)
    expect(await contar(datasetLinha)).toBe(10_000)
    const [versao] = await banco
      .select()
      .from(datasetVersao)
      .where(eq(datasetVersao.linhasGravadas, 10_000))
    expect(versao).toBeDefined()
    // Registro para o QA (RNF-02.01): aparece no resumo do Jest.
    process.stderr.write(
      `[TI-11] importação de 10.000 linhas (${(bytes.length / 1024 / 1024).toFixed(2)} MB): ${duracaoMs} ms\n`
    )
    // O `testTimeout` do projeto não vale para este arquivo; com cobertura ligada a gravação passa dos 5 s padrão.
  }, 30_000)
})
