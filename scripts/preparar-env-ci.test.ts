import { readFileSync } from "node:fs"
import { join } from "node:path"

import { lerAmbiente } from "@/lib/config/ambiente"
import { montarEnvCi, valoresDoCi } from "@/scripts/preparar-env-ci.mjs"

const HASH_VALIDO = "scrypt:16384:8:1:c2FsLWRlLXRlc3Rl:Y2hhdmUtZGUtdGVzdGU"
const EXEMPLO = readFileSync(join(__dirname, "..", ".env.example"), "utf-8")

function lerComoAmbiente(texto: string): Record<string, string> {
  return Object.fromEntries(
    texto
      .split("\n")
      .filter((linha) => /^[A-Z][A-Z0-9_]*=/.test(linha))
      .map((linha) => {
        const indice = linha.indexOf("=")
        return [linha.slice(0, indice), linha.slice(indice + 1)]
      })
  )
}

describe("preparar-env-ci (RNF-05.08)", () => {
  it("gera um .env que passa na validação do app, sem nenhum marcador do exemplo", async () => {
    const valores = await valoresDoCi(async () => HASH_VALIDO)

    const env = montarEnvCi(EXEMPLO, valores)

    expect(env).not.toMatch(/<[^>]*>/)
    expect(lerAmbiente(lerComoAmbiente(env))).toMatchObject({
      APP_URL: "http://localhost:3000",
      DEMO_ANALISTA_USUARIO: "analista-ci",
      DEMO_ADMIN_USUARIO: "admin-ci",
      PRE_CARREGAR_NA_SUBIDA: true,
    })
  })

  it("gera senha do banco diferente a cada execução e a repete na URL de conexão", async () => {
    const primeira = await valoresDoCi(async () => HASH_VALIDO)
    const segunda = await valoresDoCi(async () => HASH_VALIDO)

    expect(primeira.POSTGRES_PASSWORD).not.toBe(segunda.POSTGRES_PASSWORD)
    expect(primeira.DATABASE_URL).toContain(primeira.POSTGRES_PASSWORD)
  })

  it("não carrega valor algum do .env local", async () => {
    const valores = await valoresDoCi(async () => HASH_VALIDO)

    const env = montarEnvCi(EXEMPLO, valores)

    expect(lerComoAmbiente(env).POSTGRES_USER).toBe("acarau_ci")
    expect(env).not.toContain(process.env.POSTGRES_PASSWORD ?? "\u0000")
  })

  it("recusa o exemplo quando sobra variável sem valor", () => {
    expect(() => montarEnvCi("CHAVE=<preencha>\n", {})).toThrow(
      "Variável sem valor para o CI: CHAVE"
    )
  })
})
