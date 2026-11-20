import { readFileSync } from "node:fs"
import { join } from "node:path"

function lerVariaveis(): Record<string, string> {
  const conteudo = readFileSync(join(process.cwd(), ".env.example"), "utf8")
  const linhas = conteudo
    .split("\n")
    .filter((linha) => linha.trim() && !linha.startsWith("#"))
  return Object.fromEntries(
    linhas.map((linha) => {
      const separador = linha.indexOf("=")
      return [linha.slice(0, separador), linha.slice(separador + 1)]
    })
  )
}

const NOME_DE_SEGREDO = /SENHA|PASSWORD|SECRET|TOKEN|HASH|KEY|DATABASE_URL/
const MARCADOR = /^<.+>$/
const URL_COM_SENHA_MARCADA = /^[a-z]+:\/\/[^:@/]*:<[^>]+>@/

function ehMarcadorOuSenhaMarcada(valor: string): boolean {
  return MARCADOR.test(valor) || URL_COM_SENHA_MARCADA.test(valor)
}

describe(".env.example", () => {
  const variaveis = lerVariaveis()

  it("declara as variáveis obrigatórias da TechSpec", () => {
    expect(Object.keys(variaveis)).toEqual(
      expect.arrayContaining([
        "DATABASE_URL",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "POSTGRES_DB",
        "APP_URL",
        "DEMO_ANALISTA_USUARIO",
        "DEMO_ANALISTA_NOME",
        "DEMO_ANALISTA_SENHA_HASH",
        "DEMO_ADMIN_USUARIO",
        "DEMO_ADMIN_NOME",
        "DEMO_ADMIN_SENHA_HASH",
      ])
    )
  })

  // TU-03
  it("só tem marcador no lugar de segredo", () => {
    const segredos = Object.entries(variaveis).filter(([nome]) =>
      NOME_DE_SEGREDO.test(nome)
    )

    expect(segredos.length).toBeGreaterThan(0)
    for (const [nome, valor] of segredos) {
      expect({ nome, marcador: ehMarcadorOuSenhaMarcada(valor) }).toEqual({
        nome,
        marcador: true,
      })
    }
  })

  it("deixa usuários e nomes de conta como marcador", () => {
    const contas = Object.entries(variaveis).filter(([nome]) =>
      /^DEMO_.*(USUARIO|NOME)$/.test(nome)
    )

    expect(contas).toHaveLength(4)
    for (const [, valor] of contas) expect(valor).toMatch(MARCADOR)
  })

  it("não é ignorado pelo git", () => {
    const gitignore = readFileSync(join(process.cwd(), ".gitignore"), "utf8")

    expect(gitignore.split("\n")).toEqual(
      expect.arrayContaining([".env*", "!.env.example"])
    )
  })
})
