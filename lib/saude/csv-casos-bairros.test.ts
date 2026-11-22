import { gerarCsv } from "@/lib/exportacao/csv"
import { colunasCsvCasosBairros } from "@/lib/saude/csv-casos-bairros"
import { montarAnalisePeriodo } from "@/lib/saude/analise-periodo"
import { ANALISE_SAUDE, BAIRROS_SAUDE } from "@/test/saude-fixtures"

function linhasDoCsv(periodo: string) {
  const analise = montarAnalisePeriodo(ANALISE_SAUDE, periodo, BAIRROS_SAUDE)
  const csv = gerarCsv(
    colunasCsvCasosBairros(periodo, "SINTETICO"),
    analise.bairros
  )
  return csv.replace("﻿", "").split("\r\n").slice(0, -1)
}

describe("colunasCsvCasosBairros (TU-09, CA-05.12, RN-05.03)", () => {
  it("tem UV, Bairro, Período, Casos e Proveniência", () => {
    expect(linhasDoCsv("2026")[0]).toBe("UV;Bairro;Período;Casos;Proveniência")
  })

  it("distingue valor, zero informado e sem dados, escrevendo 'sem dados' e nunca célula vazia", () => {
    const linhas = linhasDoCsv("2026")

    expect(linhas.slice(1)).toEqual([
      "1;Outra Banda;2026;0;SINTETICO",
      "10;Centro;2026;51;SINTETICO",
      "13;Rodagem;2026;sem dados;SINTETICO",
      "20;Morada dos Ventos;2026;sem dados;SINTETICO",
    ])
    for (const linha of linhas) {
      expect(linha.split(";").every((celula) => celula !== "")).toBe(true)
    }
  })

  it("tem uma linha por bairro recebido, todas com SINTETICO, e o período pedido", () => {
    const linhas = linhasDoCsv("2025")

    expect(linhas).toHaveLength(1 + BAIRROS_SAUDE.length)
    expect(linhas.slice(1).every((linha) => linha.endsWith(";SINTETICO"))).toBe(
      true
    )
    expect(linhas[2]).toBe("10;Centro;2025;9;SINTETICO")
  })
})
