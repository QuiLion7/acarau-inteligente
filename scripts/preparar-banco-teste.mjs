// Sobe o `db` do compose e deixa prontos os bancos de teste: cria `acarau_teste`
// (Jest) e `acarau_e2e` (Playwright) se não existirem e aplica as migrações neles.
// Uso: npm run db:preparar-teste   (idempotente)
import { spawnSync } from "node:child_process"

import pg from "pg"

import { migrarBanco } from "./migrar.mjs"
import { BANCO_E2E, BANCO_TESTE, urlDoBanco } from "./url-banco.mjs"

function subirBanco() {
  const subida = spawnSync("docker", ["compose", "up", "-d", "db", "--wait"], {
    stdio: "inherit",
  })
  if (subida.status !== 0) {
    throw new Error(
      "Não foi possível subir o banco. O Docker está rodando e o .env existe (copie de .env.example)?"
    )
  }
}

async function criarSeNaoExiste(nomeBanco) {
  const cliente = new pg.Client({
    connectionString: urlDoBanco(process.env.POSTGRES_DB || "postgres"),
  })
  await cliente.connect()
  try {
    const { rowCount } = await cliente.query(
      "select 1 from pg_database where datname = $1",
      [nomeBanco]
    )
    // O nome vem de constantes deste repositório; identificador não aceita parâmetro.
    if (!rowCount) await cliente.query(`create database "${nomeBanco}"`)
  } finally {
    await cliente.end()
  }
}

async function principal() {
  try {
    subirBanco()
    for (const nomeBanco of [BANCO_TESTE, BANCO_E2E]) {
      await criarSeNaoExiste(nomeBanco)
      await migrarBanco(urlDoBanco(nomeBanco))
      process.stdout.write(`Banco ${nomeBanco} pronto.\n`)
    }
    return 0
  } catch (erro) {
    const codigo = typeof erro?.code === "string" ? ` (${erro.code})` : ""
    const motivo =
      erro instanceof Error && !erro.code ? erro.message : "falha de conexão"
    process.stderr.write(`Banco de teste não preparado${codigo}: ${motivo}\n`)
    return 1
  }
}

process.exitCode = await principal()
