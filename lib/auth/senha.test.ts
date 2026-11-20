import { spawnSync } from "node:child_process"
import { join } from "node:path"

import {
  FORMATO_HASH_SENHA,
  gerarHashSenha,
  impressaoCredencial,
  verificarSenha,
} from "@/lib/auth/senha"

const SENHA = "senha-de-teste-do-jest"

describe("gerarHashSenha", () => {
  it("gera hash no formato da TechSpec com os parâmetros padrão", async () => {
    const hash = await gerarHashSenha(SENHA)

    expect(hash).toMatch(FORMATO_HASH_SENHA)
    expect(hash.split(":").slice(0, 4)).toEqual(["scrypt", "16384", "8", "1"])
    expect(hash).not.toContain(SENHA)
  })

  it("usa sal diferente a cada chamada", async () => {
    const [primeiro, segundo] = await Promise.all([
      gerarHashSenha(SENHA),
      gerarHashSenha(SENHA),
    ])

    expect(primeiro).not.toBe(segundo)
  })
})

describe("verificarSenha", () => {
  // TU-04
  it("aceita a senha certa e recusa a errada", async () => {
    const hash = await gerarHashSenha(SENHA)

    await expect(verificarSenha(SENHA, hash)).resolves.toBe(true)
    await expect(verificarSenha(`${SENHA}x`, hash)).resolves.toBe(false)
    await expect(verificarSenha("", hash)).resolves.toBe(false)
  })

  it("trata a mesma senha em formas Unicode equivalentes como igual", async () => {
    const hash = await gerarHashSenha("senha-café")

    await expect(verificarSenha("senha-café", hash)).resolves.toBe(true)
  })

  it.each([
    ["vazio", ""],
    ["texto solto", "isso-nao-e-hash"],
    ["algoritmo desconhecido", "bcrypt:16384:8:1:c2Fs:aGFzaA"],
    ["campo faltando", "scrypt:16384:8:1:c2Fs"],
    ["chave vazia", "scrypt:16384:8:1:c2Fs:="],
    ["custo que o scrypt recusa", "scrypt:3:8:1:c2Fs:aGFzaA"],
    ["custo absurdo", `scrypt:${"9".repeat(30)}:8:1:c2Fs:aGFzaA`],
  ])(
    "devolve false sem lançar para hash malformado (%s)",
    async (_descricao, hash) => {
      await expect(verificarSenha(SENHA, hash)).resolves.toBe(false)
    }
  )
})

describe("impressaoCredencial", () => {
  it("é o SHA-256 em hexadecimal do hash, estável para o mesmo hash", () => {
    const hash = "scrypt:16384:8:1:c2Fs:aGFzaA"

    expect(impressaoCredencial(hash)).toMatch(/^[0-9a-f]{64}$/)
    expect(impressaoCredencial(hash)).toBe(impressaoCredencial(hash))
  })

  it("muda quando o hash muda (troca de senha invalida a sessão)", () => {
    expect(impressaoCredencial("scrypt:16384:8:1:c2Fs:aGFzaA")).not.toBe(
      impressaoCredencial("scrypt:16384:8:1:c2Fs:aGFzaB")
    )
  })
})

describe("npm run senha:hash (scripts/gerar-hash-senha.mjs)", () => {
  const script = join(process.cwd(), "scripts", "gerar-hash-senha.mjs")

  it("imprime só o hash da senha recebida no stdin, e ele confere com verificarSenha", async () => {
    const execucao = spawnSync(process.execPath, [script], {
      input: `${SENHA}\n`,
      encoding: "utf8",
    })

    expect(execucao.status).toBe(0)
    const hash = execucao.stdout.trim()
    expect(hash).toMatch(FORMATO_HASH_SENHA)
    expect(execucao.stdout).not.toContain(SENHA)
    await expect(verificarSenha(SENHA, hash)).resolves.toBe(true)
  })

  it("recusa senha vazia com saída diferente de zero e nada no stdout", () => {
    const execucao = spawnSync(process.execPath, [script], {
      input: "\n",
      encoding: "utf8",
    })

    expect(execucao.status).toBe(1)
    expect(execucao.stdout).toBe("")
    expect(execucao.stderr).toContain("Senha vazia")
  })
})
