import { readFileSync } from "node:fs"
import { join } from "node:path"

// Guarda estrutural da publicação (CA-05.25, CA-05.26, RNF-05.08): o que o GitHub executa só aparece na aba Actions, então
// a regra "vermelho não publica, ramo comum só verifica, nenhum segredo no verificar" é conferida no próprio arquivo.
const RAIZ = join(__dirname, "..")
const workflow = readFileSync(
  join(RAIZ, ".github", "workflows", "verificar-e-publicar.yml"),
  "utf-8"
)
const [antesDoPublicar, jobPublicar] = workflow.split(/^ {2}publicar:$/m)

describe("workflow verificar-e-publicar", () => {
  it("roda o verificar em todo push e pull request, sem depender de ramo", () => {
    expect(workflow).toMatch(/^on:\n {2}push:\n {2}pull_request:/m)
    expect(antesDoPublicar).toContain("npm run verificar")
  })

  it("só publica depois do verde e só em push na main", () => {
    expect(jobPublicar).toMatch(/needs: verificar/)
    expect(jobPublicar).toMatch(
      /if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/
    )
    expect(jobPublicar).toMatch(/environment: producao/)
    expect(jobPublicar).toMatch(/group: producao/)
  })

  it("migra e semeia antes do build e do deploy, e o deploy usa o build pronto", () => {
    const ordem = [
      "npm run db:migrar",
      "npm run demo:semear",
      " build --prod",
      "deploy --prebuilt --prod",
    ].map((trecho) => jobPublicar.indexOf(trecho))

    expect(ordem.every((posicao) => posicao > 0)).toBe(true)
    expect(ordem).toEqual([...ordem].sort((a, b) => a - b))
  })

  it("não usa segredo no job verificar (o .env do CI é fictício)", () => {
    expect(antesDoPublicar).not.toContain("secrets.")
    expect(antesDoPublicar).toContain("scripts/preparar-env-ci.mjs")
  })

  it("fixa a versão da CLI da Vercel", () => {
    expect(workflow).toMatch(/VERCEL_CLI: vercel@\d+\.\d+\.\d+/)
  })
})

describe("vercel.json", () => {
  const config = JSON.parse(readFileSync(join(RAIZ, "vercel.json"), "utf-8"))

  it("desliga a integração Git, para que só o workflow publique (RF-05.38)", () => {
    expect(config.git.deploymentEnabled).toBe(false)
  })

  it("fixa a região de São Paulo e o framework", () => {
    expect(config.regions).toEqual(["gru1"])
    expect(config.framework).toBe("nextjs")
  })
})
