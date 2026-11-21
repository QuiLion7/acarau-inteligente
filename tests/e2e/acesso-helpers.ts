import { request as playwrightRequest, type Page } from "@playwright/test"

import { CONTAS_DE_TESTE } from "./contas-teste"
import { expect, test } from "./fixtures"

export type ContaDeTeste =
  (typeof CONTAS_DE_TESTE)[keyof typeof CONTAS_DE_TESTE]

export const { analista: ANALISTA, administrador: ADMINISTRADOR } =
  CONTAS_DE_TESTE

// Login pela tela, como o usuário faz; termina com o cabeçalho já mostrando quem entrou.
export async function entrarPelaInterface(
  page: Page,
  conta: ContaDeTeste,
  caminho = "/entrar"
): Promise<void> {
  await page.goto(caminho)
  await page.getByLabel("Usuário").fill(conta.usuario)
  await page.getByLabel("Senha").fill(conta.senha)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page.getByRole("banner")).toContainText(conta.nome)
}

// Login direto na API, com o cookie indo para o navegador da página. Serve para preparar o estado dos
// testes que não são sobre o login; o `Origin` precisa ser o de APP_URL, que o servidor confere.
export async function entrarPelaApi(
  page: Page,
  conta: ContaDeTeste
): Promise<void> {
  const origem = test.info().project.use.baseURL
  const resposta = await page.request.post("/api/auth/entrar", {
    data: { usuario: conta.usuario, senha: conta.senha },
    headers: { origin: origem ?? "" },
  })
  expect(resposta.status()).toBe(200)
}

// Reinicia a demonstração como administrador, por um contexto de API à parte: o cookie do administrador não vai para
// o navegador do teste, que segue visitante (ou entra com a conta que o teste escolher). O `acarau_e2e` acumula
// datasets entre execuções e o hash do conteúdo é único, então todo spec que grava dados começa por aqui (DV-32).
export async function reiniciarDemo(): Promise<void> {
  const origem = test.info().project.use.baseURL ?? ""
  const api = await playwrightRequest.newContext({ baseURL: origem })
  try {
    const login = await api.post("/api/auth/entrar", {
      data: {
        usuario: ADMINISTRADOR.usuario,
        senha: ADMINISTRADOR.senha,
      },
      headers: { origin: origem },
    })
    expect(login.status()).toBe(200)
    const reset = await api.post("/api/demo/reset", {
      headers: { origin: origem },
    })
    expect(reset.status()).toBe(204)
  } finally {
    await api.dispose()
  }
}
