import "server-only"

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { lerAmbiente } from "@/lib/config/ambiente"
import * as schema from "@/lib/server/db/schema"
import { log } from "@/lib/server/log"

export type Banco = NodePgDatabase<typeof schema> & { $client: Pool }

/** O que o callback de `banco.transaction` recebe: as mesmas operações do banco, dentro da transação. */
export type Transacao = Parameters<Parameters<Banco["transaction"]>[0]>[0]

/** Banco ou transação: as operações que valem nos dois (a recarga da demo roda dentro da transação do reset). */
export type Executor = Banco | Transacao

const OCIOSA_MS = 10_000

export function criarBanco(urlConexao: string, maxConexoes = 10): Banco {
  const pool = new Pool({
    connectionString: urlConexao,
    max: maxConexoes,
    idleTimeoutMillis: OCIOSA_MS,
  })
  // Sem ouvinte, erro de conexão ociosa derrubaria o processo.
  pool.on("error", (erro) => log.error("db.pool_erro", { erro }))
  return drizzle({ client: pool, schema })
}

// Um pool por processo, criado na primeira consulta: importar este módulo não
// abre conexão, então o `next build` não exige banco. O globalThis evita um pool
// novo a cada recarga de módulo do `next dev`.
const escopoGlobal = globalThis as typeof globalThis & { __bancoAcarau?: Banco }

export function obterBanco(): Banco {
  if (!escopoGlobal.__bancoAcarau) {
    const ambiente = lerAmbiente()
    escopoGlobal.__bancoAcarau = criarBanco(
      ambiente.DATABASE_URL,
      ambiente.DB_POOL_MAX
    )
  }
  return escopoGlobal.__bancoAcarau
}
