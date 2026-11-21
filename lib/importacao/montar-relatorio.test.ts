import {
  analisarTexto,
  BAIRROS,
  csv,
  lerTexto,
} from "@/lib/importacao/__fixtures__/analise"
import {
  analisarImportacao,
  ehConfirmavel,
} from "@/lib/importacao/analisar-importacao"
import { montarRelatorio } from "@/lib/importacao/montar-relatorio"
import { relatorioImportacaoSchema } from "@/lib/importacao/relatorio-schema"

const HASH = "a".repeat(64)
const TEXTO = [
  "bairro,ano,casos,observacao",
  "SAO BENEDITO,2025,5,x",
  "Morada,2025,3,x",
  "Aranaú,2025,,x",
  "Aranaú,2026,2,x",
].join("\n")
const DECISOES = [
  { nomeNormalizado: "morada", tipo: "bairro", bairroId: "uv-21" },
  { nomeNormalizado: "aranau", tipo: "fora-da-cobertura" },
] as const

function relatorioDoTexto(texto: string, bairros = BAIRROS) {
  const arquivo = lerTexto(texto)
  const analise = analisarImportacao({
    arquivo,
    mapeamento: null,
    decisoes: DECISOES,
    bairros: BAIRROS,
  })
  if (!ehConfirmavel(analise)) throw new Error("fixture não é confirmável")
  return montarRelatorio({ arquivo, analise, hashConteudo: HASH, bairros })
}

describe("montarRelatorio", () => {
  it("registra o arquivo, os nomes das colunas e as colunas ignoradas", () => {
    const relatorio = relatorioDoTexto(TEXTO)

    expect(relatorio).toMatchObject({
      nomeArquivo: "casos.csv",
      hashConteudo: HASH,
      separador: ",",
      encoding: "UTF-8",
      mapeamento: { bairro: "bairro", periodo: "ano", casos: "casos" },
      colunasIgnoradas: ["observacao"],
      granularidade: "ano",
      periodos: ["2025", "2026"],
    })
  })

  it("conta lidas, gravadas, sem dado, fora da cobertura e avisos", () => {
    expect(relatorioDoTexto(TEXTO).contagens).toEqual({
      lidas: 4,
      gravadas: 4,
      semDado: 1,
      foraDaCobertura: 2,
      avisos: 1,
    })
  })

  it("registra cada decisão de bairro, automática ou manual, com o nome do bairro e as linhas", () => {
    expect(relatorioDoTexto(TEXTO).decisoesBairro).toEqual([
      {
        nomeOriginal: "SAO BENEDITO",
        destino: { tipo: "bairro", bairroId: "uv-03", nome: "São Benedito" },
        origem: "automatica",
        linhas: 1,
      },
      {
        nomeOriginal: "Morada",
        destino: { tipo: "bairro", bairroId: "uv-21", nome: "Morada Nova" },
        origem: "manual",
        linhas: 1,
      },
      {
        nomeOriginal: "Aranaú",
        destino: { tipo: "fora-da-cobertura" },
        origem: "manual",
        linhas: 2,
      },
    ])
  })

  it("sem o bairro na lista recebida usa o identificador no lugar do nome", () => {
    const semMoradaNova = BAIRROS.filter(({ id }) => id !== "uv-21")

    const relatorio = relatorioDoTexto(TEXTO, semMoradaNova)

    expect(relatorio.decisoesBairro[1]?.destino).toEqual({
      tipo: "bairro",
      bairroId: "uv-21",
      nome: "uv-21",
    })
  })

  it("nome pendente não vira decisão", () => {
    const arquivo = lerTexto(TEXTO)
    const analise = analisarImportacao({
      arquivo,
      mapeamento: null,
      decisoes: DECISOES,
      bairros: BAIRROS,
    })
    if (!ehConfirmavel(analise)) throw new Error("fixture não é confirmável")
    const comPendente = {
      ...analise,
      nomes: analise.nomes.map((nome) => ({ ...nome, destino: null })),
    }

    const relatorio = montarRelatorio({
      arquivo,
      analise: comPendente,
      hashConteudo: HASH,
      bairros: BAIRROS,
    })

    expect(relatorio.decisoesBairro).toEqual([])
  })

  it("coluna fora do cabeçalho entra com nome vazio, sem quebrar o relatório", () => {
    const arquivo = lerTexto(TEXTO)
    const analise = analisarImportacao({
      arquivo,
      mapeamento: null,
      decisoes: DECISOES,
      bairros: BAIRROS,
    })
    if (!ehConfirmavel(analise)) throw new Error("fixture não é confirmável")
    const comColunaFantasma = {
      ...analise,
      mapeamento: { bairro: 0, periodo: 1, casos: 99 },
    }

    const relatorio = montarRelatorio({
      arquivo,
      analise: comColunaFantasma,
      hashConteudo: HASH,
      bairros: BAIRROS,
    })

    expect(relatorio.mapeamento).toEqual({
      bairro: "bairro",
      periodo: "ano",
      casos: "",
    })
  })

  it("o relatório montado passa no schema de leitura do banco", () => {
    expect(
      relatorioImportacaoSchema.safeParse(relatorioDoTexto(TEXTO)).success
    ).toBe(true)
  })
})

describe("ehConfirmavel", () => {
  it("é verdadeiro só sem pendência nem erro, com as três colunas", () => {
    expect(ehConfirmavel(analisarTexto(csv("Centro,2025,9")))).toBe(true)
    expect(ehConfirmavel(analisarTexto(csv("Centro,2025,abc")))).toBe(false)
    expect(ehConfirmavel(analisarTexto(csv("Morada,2025,9")))).toBe(false)
    expect(
      ehConfirmavel(
        analisarTexto(csv("Centro,2025,9"), {
          mapeamento: { bairro: 0, periodo: 1, casos: null },
        })
      )
    ).toBe(false)
  })
})

describe("relatorioImportacaoSchema", () => {
  it.each([
    ["hash curto", { hashConteudo: "abc" }],
    ["hash em maiúsculas", { hashConteudo: "A".repeat(64) }],
    ["separador inválido", { separador: "|" }],
    ["encoding inválido", { encoding: "Latin-1" }],
    ["granularidade inválida", { granularidade: "dia" }],
  ])("recusa %s", (_, alteracao) => {
    const relatorio = { ...relatorioDoTexto(TEXTO), ...alteracao }

    expect(relatorioImportacaoSchema.safeParse(relatorio).success).toBe(false)
  })
})
