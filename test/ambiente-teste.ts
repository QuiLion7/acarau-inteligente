import { gerarHashSenha } from "@/lib/auth/senha"
import type { Ambiente } from "@/lib/config/ambiente"

// Senhas só dos testes de integração; os hashes são gerados na hora, nada vem do .env real.
export const USUARIO_ANALISTA = "analista-teste"
export const SENHA_ANALISTA = "senha-do-analista-de-teste"
export const USUARIO_ADMIN = "admin-teste"
export const SENHA_ADMIN = "senha-do-admin-de-teste"

let hashes: Promise<[string, string]> | undefined

// scrypt é lento de propósito: os dois hashes são calculados uma vez por arquivo de teste.
function obterHashes(): Promise<[string, string]> {
  hashes ??= Promise.all([
    gerarHashSenha(SENHA_ANALISTA),
    gerarHashSenha(SENHA_ADMIN),
  ])
  return hashes
}

// Ambiente completo e independente do .env. Não importa `lerAmbiente`, porque os testes o substituem por double.
export async function criarAmbienteDeTeste(
  sobrescritas: Partial<Ambiente> = {}
): Promise<Ambiente> {
  const [hashAnalista, hashAdmin] = await obterHashes()
  return {
    DATABASE_URL: "postgres://usuario:senha@localhost:5432/acarau_teste",
    APP_URL: "http://localhost:3000",
    DEMO_ANALISTA_USUARIO: USUARIO_ANALISTA,
    DEMO_ANALISTA_NOME: "Analista Demo",
    DEMO_ANALISTA_SENHA_HASH: hashAnalista,
    DEMO_ADMIN_USUARIO: USUARIO_ADMIN,
    DEMO_ADMIN_NOME: "Administrador Demo",
    DEMO_ADMIN_SENHA_HASH: hashAdmin,
    SESSAO_INATIVIDADE_MIN: 120,
    LOGIN_MAX_FALHAS: 5,
    LOGIN_JANELA_MIN: 15,
    LOGIN_BLOQUEIO_MIN: 15,
    LOG_NIVEL: "info",
    PRE_CARREGAR_NA_SUBIDA: true,
    DB_POOL_MAX: 10,
    ...sobrescritas,
  }
}
