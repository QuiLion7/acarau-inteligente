// Escreve o `.env` do runner de CI a partir do `.env.example` (TechSpec EP-05 §2, RF-05.43, RNF-05.08).
// Todos os valores são fictícios e gerados na hora: nenhum segredo real passa por aqui. As senhas das contas de demo
// são aleatórias e descartadas; só os hashes entram no `.env`, para o ambiente passar na validação do app.
// Uso: node scripts/preparar-env-ci.mjs   (recusa sobrescrever um `.env` existente fora do CI)
import { randomBytes } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

import { gerarHashSenha } from "../lib/auth/senha.ts"

/**
 * Troca o valor das variáveis do exemplo pelos de `valores`; o que não tem valor mantém o do exemplo, e um marcador
 * `<...>` que sobrar é erro (o `.env` não ficaria utilizável).
 * @param {string} exemplo conteúdo do `.env.example`
 * @param {Record<string, string>} valores
 */
export function montarEnvCi(exemplo, valores) {
  const linhas = exemplo.split("\n").map((linha) => {
    const casa = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(linha)
    if (!casa) return linha
    const [, nome, valorDoExemplo] = casa
    const valor = nome in valores ? valores[nome] : valorDoExemplo
    if (/<[^>]*>/.test(valor)) {
      throw new Error(`Variável sem valor para o CI: ${nome}`)
    }
    return `${nome}=${valor}`
  })
  return linhas.join("\n")
}

/** @param {() => Promise<string>} gerarHash devolve o hash de uma senha aleatória descartável */
export async function valoresDoCi(gerarHash) {
  const senhaBanco = randomBytes(18).toString("base64url")
  const banco = "acarau_ci"
  return {
    DATABASE_URL: `postgres://acarau_ci:${senhaBanco}@localhost:5432/${banco}`,
    POSTGRES_USER: "acarau_ci",
    POSTGRES_PASSWORD: senhaBanco,
    POSTGRES_DB: banco,
    APP_URL: "http://localhost:3000",
    DEMO_ANALISTA_USUARIO: "analista-ci",
    DEMO_ANALISTA_NOME: "Analista CI",
    DEMO_ANALISTA_SENHA_HASH: await gerarHash(),
    DEMO_ADMIN_USUARIO: "admin-ci",
    DEMO_ADMIN_NOME: "Administrador CI",
    DEMO_ADMIN_SENHA_HASH: await gerarHash(),
  }
}

async function principal() {
  const destino = ".env"
  if (existsSync(destino) && !process.env.CI) {
    process.stderr.write(
      "Já existe um .env: não foi sobrescrito (este script é do CI).\n"
    )
    return 1
  }
  const exemplo = readFileSync(".env.example", "utf-8")
  const valores = await valoresDoCi(() =>
    gerarHashSenha(randomBytes(24).toString("base64url"))
  )
  writeFileSync(destino, montarEnvCi(exemplo, valores), { mode: 0o600 })
  process.stdout.write(".env do CI escrito com valores fictícios.\n")
  return 0
}

const executadoDiretamente =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (executadoDiretamente) {
  // Sem await no topo: o Jest importa este módulo como CommonJS.
  void (async () => {
    process.exitCode = await principal()
  })()
}
