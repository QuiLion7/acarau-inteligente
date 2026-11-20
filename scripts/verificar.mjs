// Gate local da entrega (test.md §22): roda as etapas em sequência, para na primeira falha,
// diz qual falhou e sai ≠ 0. Uso: npm run verificar
import { spawnSync } from "node:child_process"
import { pathToFileURL } from "node:url"

export const ETAPAS = [
  // Sobe o db do compose e prepara acarau_teste/acarau_e2e: sem isso os testes de integração e o E2E não têm banco.
  { nome: "db:preparar-teste", comando: ["npm", "run", "db:preparar-teste"] },
  { nome: "lint", comando: ["npm", "run", "lint"] },
  { nome: "typecheck", comando: ["npm", "run", "typecheck"] },
  { nome: "test:ci", comando: ["npm", "run", "test:ci"] },
  { nome: "build", comando: ["npm", "run", "build"] },
  { nome: "test:e2e", comando: ["npm", "run", "test:e2e"] },
]

function executarNoTerminal([programa, ...argumentos]) {
  const resultado = spawnSync(programa, argumentos, {
    stdio: "inherit",
    shell: process.platform === "win32",
  })
  return resultado.status ?? 1
}

/**
 * @param {typeof ETAPAS} etapas
 * @param {(comando: string[]) => number} executar devolve o código de saída
 * @param {(texto: string) => void} escrever
 * @returns {{ ok: true } | { ok: false, etapa: string }}
 */
export function verificar(
  etapas = ETAPAS,
  executar = executarNoTerminal,
  escrever = (texto) => process.stdout.write(texto)
) {
  for (const [indice, etapa] of etapas.entries()) {
    escrever(
      `\n[verificar] etapa ${indice + 1}/${etapas.length}: ${etapa.nome}\n`
    )
    if (executar(etapa.comando) !== 0) {
      escrever(`\n[verificar] FALHOU na etapa: ${etapa.nome}\n`)
      return { ok: false, etapa: etapa.nome }
    }
  }
  escrever("\n[verificar] tudo verde.\n")
  return { ok: true }
}

const executadoDiretamente =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (executadoDiretamente) process.exitCode = verificar().ok ? 0 : 1
