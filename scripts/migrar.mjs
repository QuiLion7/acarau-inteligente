// Aplica as migrações de db/migracoes no banco de DATABASE_URL. Idempotente: o
// drizzle registra o que já rodou em drizzle.__drizzle_migrations.
// Uso: npm run db:migrar   (no container, o docker/entrypoint.sh roda antes do servidor)
// Sai com código 1 e mensagem em português; nunca imprime a URL nem a mensagem do driver.
import { fileURLToPath, pathToFileURL } from "node:url"

import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import pg from "pg"

const PASTA_MIGRACOES = fileURLToPath(
  new URL("../db/migracoes", import.meta.url)
)

async function contarAplicadas(pool) {
  const { rows } = await pool.query(
    "select to_regclass('drizzle.__drizzle_migrations') as tabela"
  )
  if (!rows[0].tabela) return 0
  const contagem = await pool.query(
    "select count(*)::int as total from drizzle.__drizzle_migrations"
  )
  return contagem.rows[0].total
}

export async function migrarBanco(urlConexao) {
  const pool = new pg.Pool({ connectionString: urlConexao, max: 1 })
  try {
    const antes = await contarAplicadas(pool)
    await migrate(drizzle({ client: pool }), {
      migrationsFolder: PASTA_MIGRACOES,
    })
    return (await contarAplicadas(pool)) - antes
  } finally {
    await pool.end()
  }
}

async function principal() {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    process.stderr.write(
      "Variável obrigatória ausente: DATABASE_URL. Preencha o .env (veja .env.example).\n"
    )
    return 1
  }
  try {
    const aplicadas = await migrarBanco(url)
    const linha = {
      ts: new Date().toISOString(),
      nivel: "info",
      evento: "db.migracao",
      aplicadas,
    }
    process.stdout.write(`${JSON.stringify(linha)}\n`)
    return 0
  } catch (erro) {
    // Só o código do erro (ex.: ECONNREFUSED): a mensagem do driver traz host e usuário.
    const codigo = typeof erro?.code === "string" ? ` (${erro.code})` : ""
    process.stderr.write(
      `Não foi possível migrar o banco${codigo}. Confira DATABASE_URL e se o banco está de pé.\n`
    )
    return 1
  }
}

const executadoDiretamente =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (executadoDiretamente) process.exitCode = await principal()
