import { readFileSync } from "node:fs"
import { join } from "node:path"

// Guarda do contexto do Docker: o `.dockerignore` exclui `dados/` e reabre só o que a imagem usa. Um arquivo copiado
// no `Dockerfile` que fique de fora quebra o build e o deploy sem nenhum teste de aplicação perceber.
const RAIZ = join(__dirname, "..")

function lerLinhas(arquivo: string): string[] {
  return readFileSync(join(RAIZ, arquivo), "utf-8")
    .split("\n")
    .map((linha) => linha.trim())
    .filter((linha) => linha !== "" && !linha.startsWith("#"))
}

/** Origens de `COPY` que vêm do contexto de build (as `--from=<estágio>` vêm de outro estágio, não do contexto). */
function origensCopiadasDoContexto(): string[] {
  return lerLinhas("Dockerfile")
    .filter((linha) => linha.startsWith("COPY ") && !linha.includes("--from="))
    .flatMap((linha) => {
      const argumentos = linha
        .split(/\s+/)
        .slice(1)
        .filter((argumento) => !argumento.startsWith("--"))
      return argumentos.slice(0, -1)
    })
    .filter((origem) => origem !== ".")
}

function padraoParaRegex(padrao: string): RegExp {
  const corpo = padrao
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\u0000")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/\u0000/g, ".*")
  return new RegExp(`^${corpo}$`)
}

function caminhoEAncestrais(caminho: string): string[] {
  const partes = caminho.split("/")
  return partes.map((_, indice) => partes.slice(0, indice + 1).join("/"))
}

/** A última regra que alcança o caminho (ou um diretório acima dele) decide; `!` reabre. */
function ficaForaDoContexto(caminho: string): boolean {
  const alvos = caminhoEAncestrais(caminho)
  let fora = false
  for (const regra of lerLinhas(".dockerignore")) {
    const reabre = regra.startsWith("!")
    const regex = padraoParaRegex(reabre ? regra.slice(1) : regra)
    if (alvos.some((alvo) => regex.test(alvo))) fora = !reabre
  }
  return fora
}

describe("contexto do Docker", () => {
  it("o .dockerignore deixa entrar todo arquivo que o Dockerfile copia do projeto", () => {
    const origens = origensCopiadasDoContexto()

    const excluidas = origens.filter(ficaForaDoContexto)

    expect(origens).toContain("dados/sinteticos/obras-pre-carregadas_DEMO.json")
    expect(excluidas).toEqual([])
  })

  it("reconhece o que o .dockerignore exclui, para a guarda não passar em falso", () => {
    expect(ficaForaDoContexto("dados/sinteticos/outro-arquivo.json")).toBe(true)
    expect(ficaForaDoContexto("dados/gerados/territorio.json")).toBe(false)
  })
})
