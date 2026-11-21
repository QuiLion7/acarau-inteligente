/**
 * CSVs sintéticos da demo (RF-02.42): o de roteiro passa pelo motor com as duas pendências do roteiro e cada adverso
 * falha pelo motivo do seu nome. Lê os arquivos de verdade, como a demo os usa.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { BAIRROS } from "@/lib/importacao/__fixtures__/analise"
import { analisarImportacao } from "@/lib/importacao/analisar-importacao"
import { lerArquivoCsv } from "@/lib/importacao/ler-arquivo-csv"
import type {
  AnaliseImportacao,
  CodigoProblema,
  MotivoRecusa,
} from "@/lib/importacao/tipos-importacao"

const PASTA = join(process.cwd(), "dados", "sinteticos")

function bytesDe(caminho: string): Uint8Array {
  return new Uint8Array(readFileSync(join(PASTA, caminho)))
}

function lerArquivo(caminho: string) {
  return lerArquivoCsv({
    nome: caminho.split("/").pop() ?? caminho,
    bytes: bytesDe(caminho),
  })
}

function analisarArquivo(caminho: string): AnaliseImportacao {
  const leitura = lerArquivo(caminho)
  if (leitura.status !== "lido") {
    throw new Error(`${caminho} foi recusado: ${leitura.motivo}`)
  }
  return analisarImportacao({
    arquivo: leitura.arquivo,
    mapeamento: null,
    decisoes: [],
    bairros: BAIRROS,
  })
}

describe("saude-roteiro_DEMO.csv", () => {
  it("lê com ponto e vírgula, BOM, acentos e dois anos", () => {
    const leitura = lerArquivo("saude-roteiro_DEMO.csv")

    expect(leitura.status).toBe("lido")
    if (leitura.status !== "lido") return
    expect(leitura.arquivo).toMatchObject({
      encoding: "UTF-8 com BOM",
      separador: ";",
      cabecalho: ["bairro", "ano", "casos"],
    })
    expect(leitura.arquivo.linhas.map(({ celulas }) => celulas[0])).toContain(
      "Antônio Livino da Silveira"
    )
  })

  it("tem um nome ambíguo e um não reconhecido: duas pendências que as decisões zeram", () => {
    const leitura = lerArquivo("saude-roteiro_DEMO.csv")
    if (leitura.status !== "lido") throw new Error("roteiro recusado")
    const analisar = (
      decisoes: Parameters<typeof analisarImportacao>[0]["decisoes"]
    ) =>
      analisarImportacao({
        arquivo: leitura.arquivo,
        mapeamento: null,
        decisoes,
        bairros: BAIRROS,
      })

    const semDecisoes = analisar([])
    const comDecisoes = analisar([
      { nomeNormalizado: "morada", tipo: "bairro", bairroId: "uv-20" },
      { nomeNormalizado: "aranau", tipo: "fora-da-cobertura" },
    ])

    expect(semDecisoes.pendencias).toBe(2)
    expect(
      semDecisoes.nomes.filter(
        ({ correspondencia }) => correspondencia.estado === "ambiguo"
      )
    ).toHaveLength(1)
    expect(
      semDecisoes.nomes.filter(
        ({ correspondencia }) => correspondencia.estado === "nao-reconhecido"
      )
    ).toHaveLength(1)
    expect(comDecisoes.pendencias).toBe(0)
    expect(comDecisoes).toMatchObject({
      podeConfirmar: true,
      granularidade: "ano",
      periodos: ["2025", "2026"],
      problemas: [],
    })
  })

  it("reconhece as grafias divergentes sozinho e traz um zero explícito", () => {
    const analise = analisarArquivo("saude-roteiro_DEMO.csv")
    const automaticos = analise.nomes
      .filter(({ correspondencia }) => correspondencia.estado === "reconhecido")
      .map(({ nomeNormalizado }) => nomeNormalizado)

    expect(automaticos).toEqual(
      expect.arrayContaining([
        "sao benedito",
        "centro",
        "rodagem",
        "outra banda",
      ])
    )
    expect(analise.resumo.semDado).toBe(0)
  })
})

describe("adversos: recusados na leitura", () => {
  it.each<[string, MotivoRecusa]>([
    ["sem-linhas_DEMO.csv", "SEM_LINHAS"],
    ["10001-linhas_DEMO.csv", "LINHAS_DEMAIS"],
    ["acento-divergente-latin1_DEMO.csv", "ENCODING_INVALIDO"],
    ["separador-misto_DEMO.csv", "SEPARADOR_MISTO"],
    ["dado-pessoal-coluna_DEMO.csv", "DADO_PESSOAL_COLUNA"],
    ["dado-pessoal-cpf_DEMO.csv", "DADO_PESSOAL_VALOR"],
    ["aspas-nao-fechadas_DEMO.csv", "ASPAS_NAO_FECHADAS"],
    ["colunas-a-mais_DEMO.csv", "COLUNAS_DIVERGENTES"],
    ["sem-cabecalho_DEMO.csv", "SEM_CABECALHO"],
  ])("%s é recusado com %s", (arquivo, motivo) => {
    expect(lerArquivo(`adversos/${arquivo}`)).toMatchObject({
      status: "recusado",
      motivo,
    })
  })
})

describe("adversos: lidos, mas a análise bloqueia ou avisa", () => {
  it.each<[string, CodigoProblema]>([
    ["decimal-invalido_DEMO.csv", "CASOS_DECIMAL"],
    ["casos-invalidos_DEMO.csv", "CASOS_NEGATIVO"],
    ["casos-invalidos_DEMO.csv", "CASOS_NAO_NUMERICO"],
    ["duplicata_DEMO.csv", "DUPLICATA"],
    ["periodo-invalido_DEMO.csv", "PERIODO_INVALIDO"],
    ["granularidade-mista_DEMO.csv", "GRANULARIDADE_MISTURADA"],
  ])("%s tem erro %s e não pode confirmar", (arquivo, codigo) => {
    const analise = analisarArquivo(`adversos/${arquivo}`)

    expect(analise.problemas.map((problema) => problema.codigo)).toContain(
      codigo
    )
    expect(analise.podeConfirmar).toBe(false)
  })

  it("territorio-desconhecido_DEMO.csv deixa todos os nomes pendentes, sem associar nenhum sozinho", () => {
    const analise = analisarArquivo("adversos/territorio-desconhecido_DEMO.csv")

    expect(analise.nomes).toHaveLength(3)
    expect(analise.pendencias).toBe(3)
    expect(analise.podeConfirmar).toBe(false)
  })

  it("valores-vazios_DEMO.csv só avisa: vira sem dado, nunca zero, e não bloqueia", () => {
    const analise = analisarArquivo("adversos/valores-vazios_DEMO.csv")

    expect(
      analise.problemas.every(({ severidade }) => severidade === "aviso")
    ).toBe(true)
    expect(analise.resumo.semDado).toBe(2)
    expect(analise.linhasNormalizadas.map(({ casos }) => casos)).toEqual([
      9,
      null,
      null,
    ])
    expect(analise.podeConfirmar).toBe(true)
  })
})

describe("saude-pre-carregado_DEMO.csv (TU-20, CA-02.28)", () => {
  const analise = analisarArquivo("saude-pre-carregado_DEMO.csv")

  it("passa no motor sem nenhuma decisão do analista, para a carga da demo não depender de ninguém", () => {
    expect(analise.podeConfirmar).toBe(true)
    expect(analise.pendencias).toBe(0)
    expect(analise.resumo).toMatchObject({
      lidas: 54,
      comErro: 0,
      foraDaCobertura: 0,
    })
  })

  it("cobre 18 bairros de 2024 a 2026, por ano", () => {
    expect(analise.granularidade).toBe("ano")
    expect(analise.periodos).toEqual(["2024", "2025", "2026"])
    const bairros = new Set(
      analise.linhasNormalizadas.map(({ bairroId }) => bairroId)
    )
    expect(bairros.size).toBe(18)
    expect(bairros.has(null)).toBe(false)
  })

  it("tem um zero explícito e deixa bairros sem nenhuma linha, que a Saúde mostra como sem dados", () => {
    const zeros = analise.linhasNormalizadas.filter(({ casos }) => casos === 0)
    expect(zeros).toHaveLength(1)
    expect(zeros[0]).toMatchObject({ nomeOriginal: "Rodagem", periodo: "2026" })
    const comLinha = new Set(
      analise.linhasNormalizadas.map(({ bairroId }) => bairroId)
    )
    expect(
      BAIRROS.filter(({ id }) => !comLinha.has(id)).length
    ).toBeGreaterThanOrEqual(1)
  })
})
