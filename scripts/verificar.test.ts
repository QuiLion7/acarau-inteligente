import { ETAPAS, verificar } from "@/scripts/verificar.mjs"

const NOMES_NA_ORDEM = [
  "dados:conferir",
  "db:preparar-teste",
  "lint",
  "typecheck",
  "test:ci",
  "build",
  "test:e2e",
]

function executorQueFalhaEm(nome?: string) {
  const chamados: string[] = []
  const executar = (comando: string[]) => {
    const etapa = ETAPAS.find((item) => item.comando === comando)
    chamados.push(etapa?.nome ?? "desconhecida")
    return etapa?.nome === nome ? 1 : 0
  }
  return { executar, chamados }
}

describe("verificar", () => {
  it("roda as etapas na ordem do gate e termina ok quando todas passam", () => {
    const { executar, chamados } = executorQueFalhaEm()

    const resultado = verificar(ETAPAS, executar, () => {})

    expect(ETAPAS.map((etapa) => etapa.nome)).toEqual(NOMES_NA_ORDEM)
    expect(chamados).toEqual(NOMES_NA_ORDEM)
    expect(resultado).toEqual({ ok: true })
  })

  it("para na primeira falha, não roda as etapas seguintes e aponta a etapa", () => {
    const { executar, chamados } = executorQueFalhaEm("test:ci")
    const saida: string[] = []

    const resultado = verificar(ETAPAS, executar, (texto) => saida.push(texto))

    expect(resultado).toEqual({ ok: false, etapa: "test:ci" })
    expect(chamados).toEqual([
      "dados:conferir",
      "db:preparar-teste",
      "lint",
      "typecheck",
      "test:ci",
    ])
    expect(saida.join("")).toContain("FALHOU na etapa: test:ci")
  })

  it("confere os artefatos de dados antes do lint", () => {
    const nomes = ETAPAS.map((etapa) => etapa.nome)

    expect(nomes).toContain("dados:conferir")
    expect(nomes.indexOf("dados:conferir")).toBeLessThan(nomes.indexOf("lint"))
    expect(ETAPAS.find((e) => e.nome === "dados:conferir")?.comando).toEqual([
      "npm",
      "run",
      "dados:territorio",
      "--",
      "--conferir",
    ])
  })
})
