import { readFileSync } from "node:fs"
import { join } from "node:path"

import type { Page } from "@playwright/test"

import { expect, test } from "./fixtures"

const PASTA_SINTETICOS = join(import.meta.dirname, "../../dados/sinteticos")

export function bytesSinteticos(caminho: string): Buffer {
  return readFileSync(join(PASTA_SINTETICOS, caminho))
}

export async function enviarArquivo(page: Page, nome: string, buffer: Buffer) {
  await page.getByLabel("Arquivo CSV").setInputFiles({
    name: nome,
    mimeType: "text/csv",
    buffer,
  })
}

export const NOME_DO_DATASET_DO_ROTEIRO = "Roteiro E2E"

// As duas decisões do roteiro (Morada é ambíguo e Aranaú não é reconhecido), pelos seletores do assistente.
export async function decidirBairrosDoRoteiro(page: Page) {
  await page
    .getByRole("combobox", { name: "Bairro para o nome Morada" })
    .click()
  await page.getByRole("option", { name: "Morada dos Ventos (UV 20)" }).click()
  await page
    .getByRole("combobox", { name: "Bairro para o nome Aranaú" })
    .click()
  await page.getByRole("option", { name: "Fora da cobertura" }).click()
}

export async function preencherMetadados(page: Page, nome: string) {
  await page.getByLabel("Nome do dataset").fill(nome)
  await page.getByLabel("Indicador").fill("Casos notificados (sintético)")
  await page.getByLabel("Fonte").fill("Planilha de roteiro")
}

// Importa o roteiro pela interface, do envio à confirmação, e devolve o id da versão gravada (privada).
export async function importarRoteiroPelaInterface(
  page: Page,
  nome = NOME_DO_DATASET_DO_ROTEIRO
): Promise<string> {
  await page.goto("/saude/importar")
  await enviarArquivo(
    page,
    "saude-roteiro_DEMO.csv",
    bytesSinteticos("saude-roteiro_DEMO.csv")
  )
  await expect(
    page.getByRole("heading", { name: "Colunas do arquivo" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Continuar" }).click()
  await decidirBairrosDoRoteiro(page)
  await page.getByRole("button", { name: "Continuar" }).click()
  await page.getByRole("button", { name: "Continuar" }).click()
  await preencherMetadados(page, nome)
  await page.getByRole("button", { name: "Confirmar importação" }).click()
  await expect(page).toHaveURL(/\/saude\?versao=[0-9a-f-]{36}$/)
  return new URL(page.url()).searchParams.get("versao") ?? ""
}

// Importa e publica o roteiro direto pela API, como a conta que já está na página (analista ou administrador).
export async function importarEPublicarRoteiroPelaApi(
  page: Page
): Promise<string> {
  const origem = test.info().project.use.baseURL ?? ""
  const dados = {
    separador: ";",
    mapeamento: { bairro: 0, periodo: 1, casos: 2 },
    decisoes: [
      { nomeNormalizado: "morada", tipo: "bairro", bairroId: "uv-20" },
      { nomeNormalizado: "aranau", tipo: "fora-da-cobertura" },
    ],
    metadados: {
      nome: NOME_DO_DATASET_DO_ROTEIRO,
      indicador: "Casos notificados (sintético)",
      fonte: "Planilha de roteiro",
    },
    destino: { tipo: "novo" },
  }
  const importacao = await page.request.post("/api/importacoes", {
    headers: { origin: origem },
    multipart: {
      arquivo: {
        name: "saude-roteiro_DEMO.csv",
        mimeType: "text/csv",
        buffer: bytesSinteticos("saude-roteiro_DEMO.csv"),
      },
      dados: JSON.stringify(dados),
    },
  })
  expect(importacao.status()).toBe(201)
  const { versaoId } = (await importacao.json()) as { versaoId: string }
  const publicacao = await page.request.post(
    `/api/datasets/versoes/${versaoId}/publicacao`,
    { headers: { origin: origem } }
  )
  expect(publicacao.status()).toBe(200)
  return versaoId
}
