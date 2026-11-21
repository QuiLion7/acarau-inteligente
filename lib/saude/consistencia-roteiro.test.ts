import { readFileSync } from "node:fs"
import { join } from "node:path"

import { analisarImportacao } from "@/lib/importacao/analisar-importacao"
import { lerArquivoCsv } from "@/lib/importacao/ler-arquivo-csv"
import { montarAnalisePeriodo } from "@/lib/saude/analise-periodo"
import { ordenarRanking } from "@/lib/saude/ranking"
import { listarResumoBairros } from "@/lib/server/territorio/territorio-repositorio"
import type { SerieSaude } from "@/lib/validations/datasets-schema"

// Os mesmos bairros que o assistente reconhece sozinho, mais as duas decisões do roteiro.
const BAIRRO_DO_NOME: Record<string, string> = {
  centro: "uv-10",
  "sao benedito": "uv-03",
  rodagem: "uv-13",
  "outra banda": "uv-01",
  piranhas: "uv-02",
  "antonio livino da silveira": "uv-07",
  mucuna: "uv-19",
  pedrinhas: "uv-05",
  morada: "uv-20",
}

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase()
}

const BYTES = new Uint8Array(
  readFileSync(
    join(process.cwd(), "dados", "sinteticos", "saude-roteiro_DEMO.csv")
  )
)

// Soma esperada lida direto do texto do CSV, sem passar pelo motor: é a verdade contra a qual se compara.
function somasDoCsv(): Map<string, number> {
  const linhas = new TextDecoder()
    .decode(BYTES)
    .replace("﻿", "")
    .trim()
    .split("\n")
    .slice(1)
  const somas = new Map<string, number>()
  for (const linha of linhas) {
    const [nome = "", periodo = "", casos = "0"] = linha.split(";")
    const bairroId = BAIRRO_DO_NOME[semAcento(nome)]
    if (!bairroId) continue
    const chave = `${bairroId}|${periodo}`
    somas.set(chave, (somas.get(chave) ?? 0) + Number(casos))
  }
  return somas
}

function serieDoRoteiro(): SerieSaude {
  const leitura = lerArquivoCsv({ nome: "roteiro.csv", bytes: BYTES })
  if (leitura.status !== "lido") throw new Error("roteiro recusado")
  const analise = analisarImportacao({
    arquivo: leitura.arquivo,
    mapeamento: null,
    decisoes: [
      { nomeNormalizado: "morada", tipo: "bairro", bairroId: "uv-20" },
      { nomeNormalizado: "aranau", tipo: "fora-da-cobertura" },
    ],
    bairros: listarResumoBairros(),
  })
  const valores: SerieSaude["valores"] = {}
  const foraDaCobertura: SerieSaude["foraDaCobertura"] = {}
  for (const { bairroId, periodo, casos } of analise.linhasNormalizadas) {
    if (bairroId === null) {
      const atual = foraDaCobertura[periodo] ?? { casos: 0, localidades: 0 }
      foraDaCobertura[periodo] = {
        casos: atual.casos + (casos ?? 0),
        localidades: atual.localidades + 1,
      }
      continue
    }
    valores[bairroId] = { ...valores[bairroId], [periodo]: casos }
  }
  return { periodos: analise.periodos, valores, foraDaCobertura }
}

describe("a análise do período bate com o CSV de roteiro (TU-19, CA-02.19)", () => {
  const serie = serieDoRoteiro()
  const bairros = listarResumoBairros()

  it.each(serie.periodos)(
    "em %s, o valor de cada bairro no objeto único é a soma das linhas do CSV, e o ranking usa o mesmo valor",
    (periodo) => {
      const analise = montarAnalisePeriodo(serie, periodo, bairros)
      const esperado = somasDoCsv()
      const { ranking } = ordenarRanking(analise.bairros)

      for (const { bairro, casos } of analise.bairros) {
        expect(casos).toBe(esperado.get(`${bairro.id}|${periodo}`) ?? null)
      }
      for (const item of ranking) {
        expect(item.casos).toBe(esperado.get(`${item.bairro.id}|${periodo}`))
      }
      expect(analise.total.casos).toBe(
        [...esperado.entries()]
          .filter(([chave]) => chave.endsWith(`|${periodo}`))
          .reduce((soma, [, casos]) => soma + casos, 0)
      )
    }
  )

  it("o fora da cobertura é Aranaú, separado do total", () => {
    expect(
      montarAnalisePeriodo(serie, "2025", bairros).foraDaCobertura
    ).toEqual({
      casos: 6,
      localidades: 1,
    })
    expect(
      montarAnalisePeriodo(serie, "2026", bairros).foraDaCobertura
    ).toEqual({
      casos: 8,
      localidades: 1,
    })
  })
})
