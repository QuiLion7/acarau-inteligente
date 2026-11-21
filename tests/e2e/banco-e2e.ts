import pg from "pg"

import { BANCO_E2E, urlDoBanco } from "../../scripts/url-banco.mjs"

// O servidor do E2E lê o `acarau_e2e`; o `.env` já foi carregado pelo `playwright.config.ts`. Serve ao caso de "nenhum
// dataset" (E2E-10), que a API não produz: o reset sempre recarrega o de exemplo.
export async function esvaziarDatasets(): Promise<void> {
  const cliente = new pg.Client({ connectionString: urlDoBanco(BANCO_E2E) })
  await cliente.connect()
  try {
    await cliente.query("delete from dataset")
  } finally {
    await cliente.end()
  }
}
