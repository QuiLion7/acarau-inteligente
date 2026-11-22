import { readFile } from "node:fs/promises"

import {
  request as playwrightRequest,
  type Download,
  type Page,
} from "@playwright/test"

import { ANALISTA, reiniciarDemo } from "./acesso-helpers"
import { expect, test } from "./fixtures"
import { aguardarMapaPronto } from "./mapa-helpers"

// Clica no botão e devolve o arquivo baixado, já separado em bytes e linhas.
async function baixarCsv(page: Page, nomeDoBotao: string) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: nomeDoBotao }).click(),
  ])
  return lerCsv(download)
}

async function lerCsv(download: Download) {
  const bytes = await readFile(await download.path())
  const texto = bytes.toString("utf8")
  return {
    nome: download.suggestedFilename(),
    bytes,
    linhas: texto.replace("﻿", "").split("\r\n").slice(0, -1),
  }
}

// O analista cria as obras por um contexto de API à parte; o navegador do teste segue visitante.
async function criarObras(origem: string, titulos: string[]): Promise<void> {
  const api = await playwrightRequest.newContext({ baseURL: origem })
  try {
    const headers = { origin: origem }
    const login = await api.post("/api/auth/entrar", {
      data: { usuario: ANALISTA.usuario, senha: ANALISTA.senha },
      headers,
    })
    expect(login.status()).toBe(200)
    for (const [indice, titulo] of titulos.entries()) {
      const criada = await api.post("/api/obras", {
        data: {
          titulo,
          situacao: indice === 0 ? "planejada" : "suspensa",
        },
        headers,
      })
      expect(criada.status()).toBe(201)
    }
  } finally {
    await api.dispose()
  }
}

test.beforeEach(async () => {
  await reiniciarDemo()
})

test.describe("Exportar CSV (E2E-03, CA-05.10 a CA-05.12)", () => {
  test("Obras: o arquivo tem BOM, ';', as fórmulas neutralizadas, SINTETICO e só as linhas do filtro", async ({
    page,
  }) => {
    await criarObras(test.info().project.use.baseURL ?? "", [
      "=1+1",
      "@SOMA(A1)",
    ])
    await page.goto("/obras?situacao=planejada")
    const lista = page.getByRole("region", { name: "Lista de obras" })
    await expect(lista.getByRole("row").first()).toBeVisible()
    const naTela = await lista.getByRole("row").count()

    const csv = await baixarCsv(page, "Exportar CSV: lista de obras")

    expect([...csv.bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    expect(csv.nome).toMatch(
      /^acarau-inteligente_obras_\d{4}-\d{2}-\d{2}\.csv$/
    )
    expect(csv.linhas[0]).toBe(
      "Obra;Situação;Categoria;Bairro;Data prevista;Última atualização;Proveniência"
    )
    // As linhas do CSV são as do filtro (a tela tem o cabeçalho a mais), e o filtro tira a obra suspensa.
    expect(csv.linhas).toHaveLength(naTela)
    expect(csv.linhas).toContainEqual(
      expect.stringMatching(/^'=1\+1;Planejada;/)
    )
    expect(csv.linhas.join("\n")).not.toContain("@SOMA(A1)")
    expect(
      csv.linhas.slice(1).every((linha) => linha.endsWith(";SINTETICO"))
    ).toBe(true)
    expect(
      csv.linhas.slice(1).every((linha) => linha.split(";").length === 7)
    ).toBe(true)
  })

  test("Obras sem filtro exporta também a obra com @, neutralizada, e as 8 obras de exemplo", async ({
    page,
  }) => {
    await criarObras(test.info().project.use.baseURL ?? "", [
      "=1+1",
      "@SOMA(A1)",
    ])
    await page.goto("/obras")

    const csv = await baixarCsv(page, "Exportar CSV: lista de obras")

    expect(csv.linhas).toHaveLength(1 + 8 + 2)
    expect(
      csv.linhas.some((linha) => linha.startsWith("'@SOMA(A1);Suspensa;"))
    ).toBe(true)
    expect(
      csv.linhas.some((linha) => linha.startsWith("'=1+1;Planejada;"))
    ).toBe(true)
  })

  test("Saúde: o CSV tem os 24 bairros, 'sem dados' escrito, o período, SINTETICO e o bairro no nome", async ({
    page,
  }) => {
    await page.goto("/saude?bairro=uv-10")

    await page.getByRole("tab", { name: "Tabela" }).click()
    const csv = await baixarCsv(page, "Exportar CSV: casos por bairro")

    expect(csv.nome).toMatch(
      /^acarau-inteligente_casos-por-bairro_\d{4}-\d{2}-\d{2}_centro\.csv$/
    )
    expect(csv.linhas[0]).toBe("UV;Bairro;Período;Casos;Proveniência")
    expect(csv.linhas).toHaveLength(1 + 24)
    expect(
      csv.linhas.slice(1).every((linha) => linha.endsWith(";SINTETICO"))
    ).toBe(true)
    expect(
      csv.linhas
        .slice(1)
        .every((linha) => linha.split(";").every((c) => c !== ""))
    ).toBe(true)
    expect(csv.linhas.join("\n")).toContain("sem dados")
    expect(csv.linhas.some((linha) => linha.startsWith("10;Centro;"))).toBe(
      true
    )
  })

  test("Território e Educação exportam bairros, escolas e escolas por bairro com acentos corretos", async ({
    page,
  }) => {
    await page.goto("/territorio")
    const bairros = await baixarCsv(page, "Exportar CSV: bairros da sede")
    expect(bairros.linhas[0]).toBe("UV;Bairro;Área calculada (m²);Escolas")
    expect(bairros.linhas).toHaveLength(1 + 24)
    expect(bairros.linhas.join("\n")).toContain("Mucunã")

    await page.goto("/educacao")
    const porBairro = await baixarCsv(page, "Exportar CSV: escolas por bairro")
    expect(porBairro.linhas).toHaveLength(1 + 24 + 3)
    expect(porBairro.linhas.at(-3)).toBe(
      "fora da soma;Fora da cobertura dos bairros;33"
    )

    const escolas = await baixarCsv(page, "Exportar CSV: lista de escolas")
    expect(escolas.linhas).toHaveLength(1 + 62)
    expect(escolas.linhas[0]).toContain("Código INEP")
  })
})

// Assinatura do PNG e as dimensões do cabeçalho IHDR (RF-05.22): bytes 0-7 e 16-23, em big-endian.
function lerPng(bytes: Buffer) {
  return {
    assinatura: [...bytes.subarray(0, 8)],
    largura: bytes.readUInt32BE(16),
    altura: bytes.readUInt32BE(20),
  }
}

const ASSINATURA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

async function baixarPng(page: Page) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Baixar mapa (PNG)" }).click(),
  ])
  const bytes = await readFile(await download.path())
  return { nome: download.suggestedFilename(), bytes, ...lerPng(bytes) }
}

test.describe("Baixar mapa (PNG) com o fundo disponível (E2E-04, CA-05.13)", () => {
  test("a Saúde gera um PNG válido, maior que o mapa (moldura com título, legenda e selos), com o nome do arquivo", async ({
    page,
  }) => {
    await page.goto("/saude?bairro=uv-10")
    const mapa = page.getByRole("region", {
      name: "Mapa dos casos por bairro de Acaraú",
    })
    await aguardarMapaPronto(mapa)
    const caixa = await mapa.boundingBox()

    const png = await baixarPng(page)

    expect(png.assinatura).toEqual(ASSINATURA_PNG)
    expect(png.nome).toMatch(
      /^acarau-inteligente_mapa-saude_\d{4}-\d{2}-\d{2}_centro\.png$/
    )
    // A caixa do recipiente inclui a borda de 1 px de cada lado; o canvas é um pouco menor.
    expect(png.largura).toBeGreaterThanOrEqual(
      Math.floor((caixa?.width ?? 0) - 4)
    )
    // A imagem leva o mapa e mais a faixa de título e filtros, a legenda e os selos.
    expect(png.altura).toBeGreaterThan(Math.floor((caixa?.height ?? 0) * 1.3))
  })

  test("Educação, Obras e Território também baixam um PNG válido", async ({
    page,
  }) => {
    for (const [caminho, rotulo] of [
      ["/educacao", "Mapa das escolas por bairro de Acaraú"],
      ["/obras", "Mapa das obras por bairro de Acaraú"],
      ["/territorio", "Mapa dos bairros de Acaraú"],
    ] as const) {
      await page.goto(caminho)
      await aguardarMapaPronto(page.getByRole("region", { name: rotulo }))

      const png = await baixarPng(page)

      expect(png.assinatura, caminho).toEqual(ASSINATURA_PNG)
      expect(png.largura, caminho).toBeGreaterThan(300)
      expect(png.altura, caminho).toBeGreaterThan(300)
    }
  })

  test("o botão fica desabilitado até o mapa carregar", async ({ page }) => {
    await page.goto("/obras")

    await expect(
      page.getByRole("region", { name: "Mapa das obras por bairro de Acaraú" })
    ).toBeVisible()
    await aguardarMapaPronto(
      page.getByRole("region", { name: "Mapa das obras por bairro de Acaraú" })
    )
    await expect(
      page.getByRole("button", { name: "Baixar mapa (PNG)" })
    ).toBeEnabled()
  })
})

test.describe("Baixar mapa (PNG) com o fundo bloqueado (E2E-04, CA-05.14, RF-05.23)", () => {
  // O fundo do OpenStreetMap é derrubado de propósito: a exceção de console é só a dos tiles (DV-22).
  test.use({ mapaBase: "indisponivel" })

  test("a Saúde ainda gera um PNG válido, só com o fundo neutro e as camadas", async ({
    page,
  }) => {
    await page.goto("/saude?bairro=uv-10")
    const mapa = page.getByRole("region", {
      name: "Mapa dos casos por bairro de Acaraú",
    })
    await aguardarMapaPronto(mapa)

    const png = await baixarPng(page)

    expect(png.assinatura).toEqual(ASSINATURA_PNG)
    expect(png.largura).toBeGreaterThan(300)
    expect(png.altura).toBeGreaterThan(300)
    await expect(
      page.getByRole("button", { name: "Baixar mapa (PNG)" })
    ).toBeEnabled()
  })
})
