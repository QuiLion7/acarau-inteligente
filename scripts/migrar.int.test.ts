import { spawnSync } from "node:child_process"
import { join } from "node:path"

import pg from "pg"

import { BANCO_TESTE, urlDoBanco } from "@/scripts/url-banco.mjs"

const script = join(process.cwd(), "scripts", "migrar.mjs")
const nomeBancoVazio = `acarau_migrar_${process.pid}_${Date.now()}`

// Só o PATH: nada do .env do desenvolvedor chega ao script.
function rodarMigrar(ambiente: Record<string, string>) {
  return spawnSync(process.execPath, [script], {
    env: { NODE_ENV: "test", PATH: process.env.PATH ?? "", ...ambiente },
    encoding: "utf8",
  })
}

async function comAdmin<T>(
  acao: (cliente: pg.Client) => Promise<T>
): Promise<T> {
  const cliente = new pg.Client({ connectionString: urlDoBanco(BANCO_TESTE) })
  await cliente.connect()
  try {
    return await acao(cliente)
  } finally {
    await cliente.end()
  }
}

async function fotografar(): Promise<{ migracoes: number; colunas: string[] }> {
  const cliente = new pg.Client({
    connectionString: urlDoBanco(nomeBancoVazio),
  })
  await cliente.connect()
  try {
    const migracoes = await cliente.query(
      "select count(*)::int as total from drizzle.__drizzle_migrations"
    )
    const colunas = await cliente.query(
      `select table_name || '.' || column_name || ':' || data_type as coluna
         from information_schema.columns
        where table_schema = 'public' order by 1`
    )
    return {
      migracoes: migracoes.rows[0].total,
      colunas: colunas.rows.map((linha) => linha.coluna),
    }
  } finally {
    await cliente.end()
  }
}

describe("scripts/migrar.mjs", () => {
  beforeAll(() =>
    comAdmin((cliente) => cliente.query(`create database "${nomeBancoVazio}"`))
  )
  afterAll(() =>
    comAdmin((cliente) =>
      cliente.query(`drop database if exists "${nomeBancoVazio}" with (force)`)
    )
  )

  // TI-01
  it("aplica as migrações num banco vazio e uma segunda execução não muda nada", async () => {
    const ambiente = { DATABASE_URL: urlDoBanco(nomeBancoVazio) }

    const primeira = rodarMigrar(ambiente)
    const depoisDaPrimeira = await fotografar()
    const segunda = rodarMigrar(ambiente)
    const depoisDaSegunda = await fotografar()

    expect(primeira.status).toBe(0)
    expect(JSON.parse(primeira.stdout)).toMatchObject({
      evento: "db.migracao",
      aplicadas: 2,
    })
    expect(depoisDaPrimeira.colunas).toEqual(
      expect.arrayContaining([
        "sessao.token_hash:text",
        "tentativa_login.ocorrida_em:timestamp with time zone",
        "dataset_versao.hash_conteudo:text",
        "dataset_linha.bairro_id:text",
      ])
    )
    expect(segunda.status).toBe(0)
    expect(JSON.parse(segunda.stdout)).toMatchObject({ aplicadas: 0 })
    expect(depoisDaSegunda).toEqual(depoisDaPrimeira)
  })

  // TI-02
  it("sem DATABASE_URL sai com código diferente de zero nomeando só a variável", () => {
    const execucao = rodarMigrar({})

    expect(execucao.status).not.toBe(0)
    expect(execucao.stderr).toContain("DATABASE_URL")
    expect(execucao.stdout).toBe("")
  })

  it("com o banco inacessível sai com código 1 sem expor URL, usuário nem mensagem do driver", () => {
    const url = "postgres://usuario-secreto:senha-secreta@127.0.0.1:1/banco"

    const execucao = rodarMigrar({ DATABASE_URL: url })

    expect(execucao.status).toBe(1)
    expect(execucao.stderr).toContain("Não foi possível migrar o banco")
    for (const segredo of ["usuario-secreto", "senha-secreta", "127.0.0.1"]) {
      expect(execucao.stderr).not.toContain(segredo)
    }
  })
})
