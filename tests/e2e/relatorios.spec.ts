import { readFile } from "node:fs/promises"

import {
  request as playwrightRequest,
  type Download,
  type Page,
} from "@playwright/test"
import { extractText, getDocumentProxy } from "unpdf"

import { violacoesGraves } from "./acessibilidade-helpers"
import { ANALISTA, entrarPelaApi, reiniciarDemo } from "./acesso-helpers"
import { esvaziarDatasets } from "./banco-e2e"
import { expect, test } from "./fixtures"
import { bytesSinteticos } from "./saude-helpers"

const previa = (page: Page) =>
  page.getByRole("article", {
    name: "Relatório territorial - Acaraú Inteligente (Demonstração Independente)",
  })

// O analista importa o roteiro (versão privada) por um contexto de API à parte; o navegador do teste segue visitante.
async function importarVersaoPrivada(origem: string): Promise<string> {
  const api = await playwrightRequest.newContext({ baseURL: origem })
  try {
    const headers = { origin: origem }
    const login = await api.post("/api/auth/entrar", {
      data: { usuario: ANALISTA.usuario, senha: ANALISTA.senha },
      headers,
    })
    expect(login.status()).toBe(200)
    const importacao = await api.post("/api/importacoes", {
      headers,
      multipart: {
        arquivo: {
          name: "saude-roteiro_DEMO.csv",
          mimeType: "text/csv",
          buffer: bytesSinteticos("saude-roteiro_DEMO.csv"),
        },
        dados: JSON.stringify({
          separador: ";",
          mapeamento: { bairro: 0, periodo: 1, casos: 2 },
          decisoes: [
            { nomeNormalizado: "morada", tipo: "bairro", bairroId: "uv-20" },
            { nomeNormalizado: "aranau", tipo: "fora-da-cobertura" },
          ],
          metadados: {
            nome: "Roteiro privado E2E",
            indicador: "Casos notificados (sintético)",
            fonte: "Planilha de roteiro",
          },
          destino: { tipo: "novo" },
        }),
      },
    })
    expect(importacao.status()).toBe(201)
    return ((await importacao.json()) as { versaoId: string }).versaoId
  } finally {
    await api.dispose()
  }
}

// Clica em "Gerar PDF" e devolve o arquivo baixado.
async function gerarPdf(page: Page): Promise<Download> {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Gerar PDF" }).click(),
  ])
  return download
}

// Texto de cada página do PDF baixado (o PDF tem texto pesquisável, CA-05.05).
async function textoDasPaginas(download: Download): Promise<string[]> {
  const bytes = new Uint8Array(await readFile(await download.path()))
  const { text } = await extractText(await getDocumentProxy(bytes), {
    mergePages: false,
  })
  // O PDF quebra linha no meio de frases: o espaço em branco é normalizado para comparar o texto.
  return text.map((pagina) => pagina.replace(/\s+/g, " ").trim())
}

const diaDeHoje = () =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date())

test.beforeEach(async () => {
  await reiniciarDemo()
})

test.describe("Relatórios: prévia (E2E-01 parte 1, CA-05.01, CA-05.02)", () => {
  test("o visitante abre Relatórios e vê filtros e a prévia com as cinco seções, sem 'em breve', e a página passa no axe", async ({
    page,
  }) => {
    await page.goto("/relatorios")

    await expect(
      page.getByRole("heading", { level: 1, name: "Relatórios" })
    ).toBeVisible()
    await expect(page.getByRole("combobox", { name: "Bairro" })).toBeVisible()
    await expect(page.getByRole("combobox", { name: "Período" })).toBeVisible()
    await expect(previa(page)).toBeVisible()
    for (const secao of [
      "Território",
      "Saúde",
      "Educação",
      "Obras",
      "Fontes e limitações",
    ]) {
      await expect(
        previa(page).getByRole("heading", { level: 3, name: secao })
      ).toBeVisible()
    }
    await expect(page.getByText("DADOS SINTÉTICOS").first()).toBeVisible()
    await expect(page.locator("#conteudo")).not.toContainText(
      "Disponível em breve"
    )
    expect(await violacoesGraves(page)).toEqual([])
  })

  test("'Exportar relatório' na Saúde com o Centro e o período abre Relatórios com os mesmos filtros", async ({
    page,
  }) => {
    await page.goto("/saude?bairro=uv-10&periodo=2026")

    await page.getByRole("link", { name: "Exportar relatório" }).click()

    await expect(page).toHaveURL(/\/relatorios\?bairro=uv-10&periodo=2026$/)
    await expect(page.getByRole("combobox", { name: "Bairro" })).toHaveValue(
      "Centro (UV 10)"
    )
    await expect(
      previa(page).getByRole("heading", { level: 3, name: "Saúde" })
    ).toBeVisible()
    await expect(previa(page)).toContainText("Centro")
  })

  test("'Exportar relatório' em Educação e Obras leva o bairro escolhido", async ({
    page,
  }) => {
    await page.goto("/educacao?bairro=uv-10")
    await page.getByRole("link", { name: "Exportar relatório" }).click()
    await expect(page).toHaveURL(/\/relatorios\?bairro=uv-10$/)

    await page.goto("/obras?bairro=uv-10&situacao=planejada")
    await page.getByRole("link", { name: "Exportar relatório" }).click()
    await expect(page).toHaveURL(/\/relatorios\?bairro=uv-10$/)
  })

  test("trocar o bairro nos filtros reescreve a URL e refaz a prévia", async ({
    page,
  }) => {
    await page.goto("/relatorios")

    await page.getByRole("combobox", { name: "Bairro" }).click()
    await page.getByRole("option", { name: "Centro (UV 10)" }).click()

    await expect(page).toHaveURL(/bairro=uv-10/)
    await expect(
      previa(page).getByText(/Bairro em destaque \(contorno grosso\): Centro/)
    ).toBeVisible()
  })

  test("sem nenhum dataset a prévia diz 'sem dados' na Saúde e mantém as demais seções (E2E-02, parte da prévia)", async ({
    page,
  }) => {
    await esvaziarDatasets()

    await page.goto("/relatorios")

    await expect(
      previa(page).getByText("Sem dados: nenhum dataset de saúde disponível.")
    ).toBeVisible()
    await expect(page.getByRole("combobox", { name: "Período" })).toHaveCount(0)
    await expect(
      previa(page).getByRole("heading", { level: 3, name: "Educação" })
    ).toBeVisible()
    await expect(
      previa(page).getByRole("heading", { level: 3, name: "Obras" })
    ).toBeVisible()
  })
})

test.describe("Relatórios: versão privada (E2E-06, CA-05.07)", () => {
  test("o visitante que pede uma versão privada recebe 'não encontrado', sem nenhum dado dela", async ({
    page,
  }) => {
    const versaoId = await importarVersaoPrivada(
      test.info().project.use.baseURL ?? ""
    )

    await page.goto(`/relatorios?versao=${versaoId}`)

    await expect(
      page.getByRole("heading", { name: "Versão não encontrada" })
    ).toBeVisible()
    await expect(page.locator("#conteudo")).not.toContainText(
      "Roteiro privado E2E"
    )
    await expect(previa(page)).toHaveCount(0)
  })

  test("o analista com a versão privada vê a prévia com o aviso de versão não publicada", async ({
    page,
  }) => {
    const versaoId = await importarVersaoPrivada(
      test.info().project.use.baseURL ?? ""
    )
    await entrarPelaApi(page, ANALISTA)

    await page.goto(`/relatorios?versao=${versaoId}`)

    await expect(previa(page)).toBeVisible()
    await expect(
      previa(page).getByText("Versão não publicada - uso interno")
    ).toHaveCount(2)
    await expect(previa(page)).toContainText("Roteiro privado E2E")
  })
})

test.describe("Relatórios: PDF (E2E-01, E2E-02, CA-05.01 a CA-05.06, CA-05.31)", () => {
  test("o visitante vai da Saúde com o Centro ao relatório, gera o PDF e o texto tem tudo, com os mesmos total e ranking da tela", async ({
    page,
  }) => {
    await page.goto("/saude?bairro=uv-10")
    const total = await page
      .getByRole("group", { name: "Total do período" })
      .locator("p")
      .nth(1)
      .innerText()
    const periodo = await page
      .getByRole("combobox", { name: "Período" })
      .innerText()
    const ranking = page
      .getByRole("heading", { name: "Ranking dos bairros" })
      .locator("..")
      .getByRole("listitem")
    const doRanking = await ranking.evaluateAll((itens) =>
      itens.slice(0, 3).map((item) => ({
        bairro: item.querySelector("button")?.textContent ?? "",
        casos: item.querySelector("span")?.textContent ?? "",
      }))
    )
    expect(doRanking).toHaveLength(3)

    await page.getByRole("link", { name: "Exportar relatório" }).click()
    await expect(page).toHaveURL(/\/relatorios\?bairro=uv-10/)
    const download = await gerarPdf(page)

    expect(download.suggestedFilename()).toMatch(
      /^acarau-inteligente_relatorio_\d{4}-\d{2}-\d{2}_centro\.pdf$/
    )
    const paginas = await textoDasPaginas(download)
    const pdf = paginas.join("\n")
    expect(paginas.length).toBeGreaterThan(1)
    for (const esperado of [
      "Relatório territorial - Acaraú Inteligente (Demonstração Independente)",
      "não constitui sistema oficial da Prefeitura de Acaraú",
      "24 bairros da sede; não cobre o município inteiro",
      "Gerado por",
      "Visitante",
      "DADOS SINTÉTICOS",
      "Como os números são calculados",
      "Fonte: ",
      "Centro",
      "Saúde",
      "Educação",
      "Fontes e limitações",
      "© OpenStreetMap contributors",
    ]) {
      expect(pdf).toContain(esperado)
    }
    expect(pdf).toContain(diaDeHoje())
    expect(pdf).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)
    expect(pdf).toContain(periodo.trim())
    expect(pdf).toContain(total.trim())
    for (const [indice, { bairro, casos }] of doRanking.entries()) {
      expect(pdf).toContain(`${indice + 1}. ${bairro}: ${casos.trim()}`)
    }
    // A marca d'água e o rodapé estão em toda página (CA-05.03).
    for (const [indice, textoDaPagina] of paginas.entries()) {
      expect(textoDaPagina, `página ${indice + 1}`).toContain("DEMONSTRAÇÃO")
      expect(textoDaPagina, `página ${indice + 1}`).toContain(
        `Página ${indice + 1} de ${paginas.length}`
      )
    }
  })

  test("sem nenhum dataset o PDF diz 'sem dados' na Saúde, não tem número de casos e traz as demais seções (E2E-02)", async ({
    page,
  }) => {
    await esvaziarDatasets()
    await page.goto("/relatorios")

    const paginas = await textoDasPaginas(await gerarPdf(page))

    const pdf = paginas.join("\n")
    expect(pdf).toContain("Sem dados: nenhum dataset de saúde disponível.")
    expect(pdf).not.toContain("Total do período")
    expect(pdf).not.toContain("Ranking dos bairros")
    for (const secao of [
      "Território",
      "Educação",
      "Obras",
      "Fontes e limitações",
    ]) {
      expect(pdf).toContain(secao)
    }
    expect(pdf).toContain("Nenhum dataset publicado.")
    for (const textoDaPagina of paginas) {
      expect(textoDaPagina).toContain("DEMONSTRAÇÃO")
    }
  })

  test("o analista com a versão privada gera o PDF com o aviso de versão não publicada no cabeçalho e na Saúde (CA-05.07)", async ({
    page,
  }) => {
    const versaoId = await importarVersaoPrivada(
      test.info().project.use.baseURL ?? ""
    )
    await entrarPelaApi(page, ANALISTA)
    await page.goto(`/relatorios?versao=${versaoId}`)

    const pdf = (await textoDasPaginas(await gerarPdf(page))).join("\n")

    expect(pdf.split("Versão não publicada - uso interno")).toHaveLength(3)
    expect(pdf).toContain("Roteiro privado E2E")
    expect(pdf).toContain("Analista Demo")
  })
})

test.describe("Relatórios: falha na geração do PDF (CA-05.08)", () => {
  // O navegador registra "Failed to load resource" quando a fonte é derrubada de propósito.
  test.use({ errosDeConsolePermitidos: [/Failed to load resource/] })

  test("falha na geração mostra a mensagem recuperável e 'Tentar de novo' baixa o PDF (CA-05.08)", async ({
    page,
  }) => {
    let falhar = true
    await page.route("**/fontes/Roboto-Regular.ttf", (rota) => {
      if (!falhar) return rota.continue()
      return rota.abort()
    })
    await page.goto("/relatorios")

    await page.getByRole("button", { name: "Gerar PDF" }).click()

    const alerta = page
      .getByRole("alert")
      .filter({ hasText: "Não foi possível gerar o PDF" })
    await expect(alerta).toContainText(
      "Não foi possível gerar o PDF. Tente de novo."
    )
    await expect(alerta).not.toContainText(/font|Roboto|fetch/i)
    falhar = false
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      alerta.getByRole("button", { name: "Tentar de novo" }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)
    await expect(alerta).toHaveCount(0)
  })
})
