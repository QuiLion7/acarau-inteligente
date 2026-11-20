// Monta a URL de um banco do Postgres do compose (host localhost) a partir do .env.
// Usada pelos scripts e pelos testes de integração, que têm bancos próprios.

/** @param {string} nomeBanco @param {Record<string, string | undefined>} [ambiente] */
export function urlDoBanco(nomeBanco, ambiente = process.env) {
  const { POSTGRES_USER, POSTGRES_PASSWORD, DB_PORT } = ambiente
  if (!POSTGRES_USER || !POSTGRES_PASSWORD) {
    throw new Error(
      "Defina POSTGRES_USER e POSTGRES_PASSWORD no .env (copie de .env.example)."
    )
  }
  const usuario = encodeURIComponent(POSTGRES_USER)
  const senha = encodeURIComponent(POSTGRES_PASSWORD)
  return `postgres://${usuario}:${senha}@localhost:${DB_PORT || "5432"}/${nomeBanco}`
}

/** Banco de integração (Jest) e banco do E2E (Playwright). */
export const BANCO_TESTE = "acarau_teste"
export const BANCO_E2E = "acarau_e2e"
