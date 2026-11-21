import { readFileSync } from "node:fs"
import { join } from "node:path"

import type { Page } from "@playwright/test"

import { ANALISTA, entrarPelaApi } from "./acesso-helpers"
import { expect, test } from "./fixtures"

const PASTA_SINTETICOS = join(import.meta.dirname, "../../dados/sinteticos")

function bytesDo(caminho: string): Buffer {
  return readFileSync(join(PASTA_SINTETICOS, caminho))
}

// O banco do E2E acumula dados entre execuções e o hash do conteúdo é único: cada execução importa um roteiro
// com um valor próprio, para a confirmação não esbarrar em "já importado" da rodada anterior.
function roteiroUnico(): Buffer {
  const casosDoCentro = 1000 + Math.floor(Math.random() * 1_000_000)
  return Buffer.from(
    bytesDo("saude-roteiro_DEMO.csv")
      .toString("utf-8")
      .replace("Centro;2025;42", `Centro;2025;${casosDoCentro}`),
    "utf-8"
  )
}

async function enviarArquivo(page: Page, nome: string, buffer: Buffer) {
  await page.getByLabel("Arquivo CSV").setInputFiles({
    name: nome,
    mimeType: "text/csv",
    buffer,
  })
}

async function escolher(page: Page, campo: string, opcao: string) {
  await page.getByRole("combobox", { name: campo }).click()
  await page.getByRole("option", { name: opcao }).click()
}

async function continuar(page: Page) {
  await page.getByRole("button", { name: "Continuar" }).click()
}

async function contarVersoesNaLista(page: Page): Promise<number> {
  await page.goto("/saude/datasets")
  const tabela = page.getByRole("table")
  const vazio = page.getByText("Nenhum dataset importado")
  await expect(tabela.or(vazio)).toBeVisible()
  if (await vazio.isVisible()) return 0
  return (await tabela.getByRole("row").count()) - 1
}

test.describe("importação de CSV pelo analista", () => {
  test.beforeEach(async ({ page }) => {
    await entrarPelaApi(page, ANALISTA)
  })

  test("E2E-02: CSV com erro mostra os motivos por linha, não confirma e nada aparece na lista", async ({
    page,
  }) => {
    const antes = await contarVersoesNaLista(page)

    await page.goto("/saude/importar")
    await enviarArquivo(
      page,
      "duplicata_DEMO.csv",
      bytesDo("adversos/duplicata_DEMO.csv")
    )
    await expect(
      page.getByRole("heading", { name: "Colunas do arquivo" })
    ).toBeVisible()
    await continuar(page)
    await continuar(page)

    await expect(page.getByRole("heading", { name: "Validação" })).toBeVisible()
    await expect(page.locator("#conteudo").getByRole("alert")).toContainText(
      "Há erros que bloqueiam a importação"
    )
    await expect(page.getByText(/Linhas 2 e 3: Duplicata/)).toBeVisible()
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled()
    await expect(
      page.getByRole("button", { name: "Confirmar importação" })
    ).toHaveCount(0)

    expect(await contarVersoesNaLista(page)).toBe(antes)
  })

  test("confirma o roteiro, a versão nasce privada na lista, publica e despublica; reenviar o mesmo arquivo bloqueia", async ({
    page,
  }) => {
    const roteiro = roteiroUnico()
    const nomeDoDataset = `Roteiro E2E ${Date.now()}`

    await page.goto("/saude/importar")
    await enviarArquivo(page, "roteiro-e2e.csv", roteiro)
    await expect(
      page.getByRole("heading", { name: "Colunas do arquivo" })
    ).toBeVisible()
    await continuar(page)
    await escolher(
      page,
      "Bairro para o nome Morada",
      "Morada dos Ventos (UV 20)"
    )
    await escolher(page, "Bairro para o nome Aranaú", "Fora da cobertura")
    await continuar(page)
    await continuar(page)
    await expect(
      page.getByRole("heading", { name: "Confirmar importação" })
    ).toBeVisible()
    await page.getByLabel("Nome do dataset").fill(nomeDoDataset)
    await page.getByLabel("Indicador").fill("Casos notificados (sintético)")
    await page.getByLabel("Fonte").fill("Planilha de roteiro")
    await page.getByRole("button", { name: "Confirmar importação" }).click()

    await expect(page).toHaveURL(/\/saude\?versao=[0-9a-f-]{36}$/)

    await page.goto("/saude/datasets")
    const linha = page.getByRole("row").filter({ hasText: nomeDoDataset })
    await expect(linha.getByText("Privado")).toBeVisible()
    await linha.getByRole("button", { name: /^Publicar / }).click()
    await expect(linha.getByText("Publicado")).toBeVisible()
    await linha.getByRole("button", { name: /^Despublicar / }).click()
    await expect(linha.getByText("Privado")).toBeVisible()

    await linha.getByRole("button", { name: /^Ver relatório / }).click()
    const relatorio = page.getByRole("dialog", {
      name: "Relatório de processamento",
    })
    await expect(relatorio.getByText("roteiro-e2e.csv")).toBeVisible()
    await expect(relatorio.getByText("SINTETICO")).toBeVisible()
    await relatorio.getByRole("button", { name: "Fechar" }).click()

    await page.goto("/saude/importar")
    await enviarArquivo(page, "copia-do-roteiro.csv", roteiro)
    await expect(page.locator("#conteudo").getByRole("alert")).toContainText(
      `Este arquivo já foi importado no dataset ${nomeDoDataset} (versão 1).`
    )
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled()
  })
})

test.describe("visitante e as rotas de importação", () => {
  test("E2E-03: não vê Importar CSV e as rotas do assistente e da lista pedem login", async ({
    page,
  }) => {
    await page.goto("/saude")
    await expect(page.getByRole("link", { name: "Importar CSV" })).toHaveCount(
      0
    )
    await expect(page.getByRole("link", { name: "Datasets" })).toHaveCount(0)

    for (const rota of ["/saude/importar", "/saude/datasets"]) {
      await page.goto(rota)

      await expect(page).toHaveURL(/\/entrar\?motivo=restrito&retorno=/)
      await expect(page.locator("#conteudo").getByRole("alert")).toContainText(
        "Entre para acessar esta área."
      )
    }
  })

  test("E2E-03: as operações da API também recusam quem não tem sessão, sem dado no corpo", async ({
    page,
  }) => {
    const origem = test.info().project.use.baseURL ?? ""
    const idQualquer = "7d0c2b8e-1f3a-4c55-9a0e-2d5b8f7c4e10"
    const chamadas = [
      page.request.get("/api/datasets"),
      page.request.get(`/api/datasets/versoes/${idQualquer}/relatorio`),
      page.request.post(`/api/datasets/versoes/${idQualquer}/publicacao`, {
        headers: { origin: origem },
      }),
      page.request.delete(`/api/datasets/versoes/${idQualquer}/publicacao`, {
        headers: { origin: origem },
      }),
      page.request.get(`/api/importacoes/conteudo/${"0".repeat(64)}`),
    ]

    for (const resposta of await Promise.all(chamadas)) {
      expect(resposta.status()).toBe(401)
      expect(await resposta.json()).toMatchObject({
        code: "NAO_AUTENTICADO",
      })
    }
  })
})
