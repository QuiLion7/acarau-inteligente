import "server-only"

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { lerAmbiente } from "@/lib/config/ambiente"
import * as schema from "@/lib/server/db/schema"
import { log } from "@/lib/server/log"

export type Banco = NodePgDatabase<typeof schema> & { $client: Pool }

export function criarBanco(urlConexao: string): Banco {
  const pool = new Pool({ connectionString: urlConexao })
  // Sem ouvinte, erro de conexão ociosa derrubaria o processo.
  pool.on("error", (erro) => log.error("db.pool_erro", { erro }))
  return drizzle({ client: pool, schema })
}

// Um pool por processo, criado na primeira consulta: importar este módulo não
// abre conexão, então o `next build` não exige banco. O globalThis evita um pool
// novo a cada recarga de módulo do `next dev`.
const escopoGlobal = globalThis as typeof globalThis & { __bancoAcarau?: Banco }

export function obterBanco(): Banco {
  escopoGlobal.__bancoAcarau ??= criarBanco(lerAmbiente().DATABASE_URL)
  return escopoGlobal.__bancoAcarau
}
