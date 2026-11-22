import { gerarCsv } from "@/lib/exportacao/csv"
import { montarObra } from "@/lib/obras/__fixtures__/obra"
import { colunasCsvObras } from "@/lib/obras/csv-obras"

const BAIRROS = [{ id: "uv-10", nome: "Centro" }]

function linhasDoCsv(...obras: Parameters<typeof montarObra>[0][]) {
  const csv = gerarCsv(
    colunasCsvObras(BAIRROS),
    obras.map((obra) => montarObra(obra))
  )
  return csv.replace("﻿", "").split("\r\n").slice(0, -1)
}

describe("colunasCsvObras (TU-09, CA-05.11, CA-05.12)", () => {
  it("tem as colunas da lista mais a Proveniência, nessa ordem", () => {
    expect(linhasDoCsv()[0]).toBe(
      "Obra;Situação;Categoria;Bairro;Data prevista;Última atualização;Proveniência"
    )
  })

  it("escreve situação, categoria e bairro por extenso, a data como dd/mm/aaaa e SINTETICO em cada linha", () => {
    const [, linha] = linhasDoCsv({
      titulo: "DEMO - Praça no Centro",
      situacao: "em_andamento",
      categoria: "praca_lazer",
      estadoLocalizacao: "dentro-de-bairro",
      bairroId: "uv-10",
      dataPrevista: "2027-03-15",
      atualizadoEm: "2026-11-03T10:00:00.000Z",
    })

    expect(linha).toBe(
      "DEMO - Praça no Centro;Em andamento;Praça e lazer;Centro;15/03/2027;03/11/2026;SINTETICO"
    )
  })

  it("onde não há dado escreve texto, nunca célula vazia: categoria, data e localização", () => {
    const [, semLocalizacao, foraDaCobertura] = linhasDoCsv(
      { titulo: "DEMO - sem ponto" },
      {
        titulo: "DEMO - fora",
        estadoLocalizacao: "fora-da-cobertura",
        dataPrevista: null,
      }
    )

    expect(semLocalizacao).toBe(
      "DEMO - sem ponto;Planejada;não informada;Sem localização;não informada;21/11/2026;SINTETICO"
    )
    expect(foraDaCobertura).toContain(";Fora da cobertura dos bairros;")
    for (const linha of [semLocalizacao, foraDaCobertura]) {
      expect(linha.split(";").every((celula) => celula !== "")).toBe(true)
    }
  })

  it("neutraliza o título que começa com = ou @ e mantém SINTETICO", () => {
    const linhas = linhasDoCsv({ titulo: "=1+1" }, { titulo: "@SOMA(A1)" })

    expect(linhas[1].startsWith("'=1+1;")).toBe(true)
    expect(linhas[2].startsWith("'@SOMA(A1);")).toBe(true)
    expect(linhas.slice(1).every((linha) => linha.endsWith(";SINTETICO"))).toBe(
      true
    )
  })

  it("não exporta o valor previsto, que não é coluna da lista nem valor pago", () => {
    const [cabecalho, linha] = linhasDoCsv({
      valorPrevistoCentavos: 25_000_000,
    })

    expect(cabecalho).not.toMatch(/valor/i)
    expect(linha).not.toContain("250")
  })
})
