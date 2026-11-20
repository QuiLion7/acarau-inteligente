import { existsSync } from "node:fs"

import { defineConfig, devices } from "@playwright/test"

import { gerarHashSenha } from "./lib/auth/senha"
import { BANCO_E2E, urlDoBanco } from "./scripts/url-banco.mjs"
import { CONTAS_DE_TESTE } from "./tests/e2e/contas-teste"

const PORTA_E2E = 3100
const URL_BASE = `http://localhost:${PORTA_E2E}`

// O Playwright não lê o .env; ele traz POSTGRES_* e DB_PORT para montar a URL do banco acarau_e2e.
if (existsSync(".env")) process.loadEnvFile(".env")

const { analista, administrador } = CONTAS_DE_TESTE

// O servidor do E2E tem ambiente próprio e completo: nada do .env da aplicação (contas, banco) vaza para ele.
const ambienteDoServidor = {
  DATABASE_URL: urlDoBanco(BANCO_E2E),
  APP_URL: URL_BASE,
  DEMO_ANALISTA_USUARIO: analista.usuario,
  DEMO_ANALISTA_NOME: analista.nome,
  DEMO_ANALISTA_SENHA_HASH: await gerarHashSenha(analista.senha),
  DEMO_ADMIN_USUARIO: administrador.usuario,
  DEMO_ADMIN_NOME: administrador.nome,
  DEMO_ADMIN_SENHA_HASH: await gerarHashSenha(administrador.senha),
  LOG_NIVEL: "warn",
}

export default defineConfig({
  testDir: "./tests/e2e",
  // Serial: os testes compartilham o banco acarau_e2e (sessões e bloqueio de login).
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  // Sem retry: passar só na nova tentativa é falha a investigar (test.md §14).
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: URL_BASE, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Exige `npm run build` antes (o `npm run verificar` já faz).
    command: `npx next start -p ${PORTA_E2E}`,
    // 503 não conta como pronto: o teste só começa com o banco respondendo.
    url: `${URL_BASE}/api/saude`,
    env: ambienteDoServidor,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
