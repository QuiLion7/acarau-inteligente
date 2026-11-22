import { gerarCsv } from "@/lib/exportacao/csv"
import { COLUNAS_CSV_BAIRROS } from "@/lib/territorio/csv-bairros"
import {
  COLUNAS_CSV_ESCOLAS,
  SEM_BAIRRO_CSV,
} from "@/lib/territorio/csv-escolas"
import {
  COLUNAS_CSV_ESCOLAS_POR_BAIRRO,
  linhasCsvEscolasPorBairro,
} from "@/lib/territorio/csv-escolas-por-bairro"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

const { bairros, escolas, qualidade } = obterDadosTerritorio()

function linhas(csv: string): string[] {
  return csv.replace("﻿", "").split("\r\n").slice(0, -1)
}

describe("CSV dos bairros do Território (RF-05.18)", () => {
  it("tem UV, Bairro, Área calculada (m²) e Escolas, com os 24 bairros e a área com vírgula decimal", () => {
    const resultado = linhas(gerarCsv(COLUNAS_CSV_BAIRROS, bairros))

    expect(resultado[0]).toBe("UV;Bairro;Área calculada (m²);Escolas")
    expect(resultado).toHaveLength(25)
    const primeiro = bairros[0]
    expect(resultado[1]).toBe(
      `${primeiro.uv};${primeiro.nome};${(Math.round(primeiro.areaCalculadaM2 * 10) / 10).toString().replace(".", ",")};${primeiro.totalEscolas}`
    )
  })

  it("escreve o zero real de escolas como 0, não como vazio", () => {
    const semEscola = bairros.find(({ totalEscolas }) => totalEscolas === 0)!
    const [, linha] = linhas(gerarCsv(COLUNAS_CSV_BAIRROS, [semEscola]))

    expect(linha.endsWith(";0")).toBe(true)
  })
})

describe("CSV da lista de escolas (RF-05.18, RF-05.21)", () => {
  const linhasDeEscola = escolas.map((escola) => ({
    ...escola,
    bairroNome: bairros.find(({ id }) => id === escola.bairroId)?.nome ?? null,
  }))

  it("tem as colunas da tabela, uma linha por escola recebida, com a cobertura por extenso", () => {
    const resultado = linhas(gerarCsv(COLUNAS_CSV_ESCOLAS, linhasDeEscola))

    expect(resultado[0]).toBe(
      "Escola;Código INEP;Dependência;Localização;Bairro;Cobertura"
    )
    expect(resultado).toHaveLength(1 + escolas.length)
    expect(resultado.join("\n")).toContain("Fora do limite municipal")
    expect(resultado.join("\n")).toContain("Sem localização")
  })

  it("escola sem bairro sai como 'sem bairro', nunca célula vazia", () => {
    const resultado = linhas(gerarCsv(COLUNAS_CSV_ESCOLAS, linhasDeEscola))

    expect(
      resultado.some((linha) => linha.includes(`;${SEM_BAIRRO_CSV};`))
    ).toBe(true)
    for (const linha of resultado) {
      expect(linha.split(";").every((celula) => celula !== "")).toBe(true)
    }
  })

  it("só exporta as linhas recebidas (o filtro da tela), não a base inteira", () => {
    const so = linhasDeEscola.filter(
      ({ dependencia }) => dependencia === "Municipal"
    )

    expect(linhas(gerarCsv(COLUNAS_CSV_ESCOLAS, so))).toHaveLength(
      1 + so.length
    )
  })
})

describe("CSV de escolas por bairro (RF-05.18, DV-39)", () => {
  it("traz os bairros e as três linhas fora da soma, que fecham 24 + 33 + 1 + 4 = 62", () => {
    const rows = linhasCsvEscolasPorBairro(bairros, qualidade)
    const resultado = linhas(gerarCsv(COLUNAS_CSV_ESCOLAS_POR_BAIRRO, rows))

    expect(resultado[0]).toBe("UV;Bairro;Escolas")
    expect(resultado).toHaveLength(1 + 24 + 3)
    expect(resultado.slice(-3)).toEqual([
      "fora da soma;Fora da cobertura dos bairros;33",
      "fora da soma;Fora do limite municipal;1",
      "fora da soma;Sem localização;4",
    ])
    const total = rows.reduce((soma, { escolas: n }) => soma + n, 0)
    expect(total).toBe(qualidade.totalCatalogo)
  })

  it("mantém a ordem dos bairros recebida (a da tabela ordenada)", () => {
    const invertidos = bairros.toReversed()

    const rows = linhasCsvEscolasPorBairro(invertidos, qualidade)

    expect(rows.slice(0, 24).map(({ nome }) => nome)).toEqual(
      invertidos.map(({ nome }) => nome)
    )
  })
})
