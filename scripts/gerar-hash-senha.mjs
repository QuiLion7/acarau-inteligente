// Gera o hash de senha das contas de demo (formato da TechSpec §4.3).
// Uso: npm run -s senha:hash   (a senha vem do terminal, sem eco, ou do stdin quando há pipe)
// A senha nunca é argumento de linha de comando: ficaria no histórico do shell.
import { Writable } from "node:stream"
import { createInterface } from "node:readline"

import { gerarHashSenha } from "../lib/auth/senha.ts"

async function lerTudo(entrada) {
  const pedacos = []
  for await (const pedaco of entrada) pedacos.push(pedaco)
  return Buffer.concat(pedacos).toString("utf8")
}

function lerSemEco(pergunta) {
  const mudo = new Writable({
    write: (_pedaco, _codificacao, pronto) => pronto(),
  })
  const leitor = createInterface({
    input: process.stdin,
    output: mudo,
    terminal: true,
  })
  process.stderr.write(pergunta)
  return new Promise((resolve) => {
    leitor.question("", (resposta) => {
      leitor.close()
      process.stderr.write("\n")
      resolve(resposta)
    })
  })
}

async function lerSenha() {
  if (process.stdin.isTTY)
    return lerSemEco("Senha (não aparece enquanto digita): ")
  return (await lerTudo(process.stdin)).replace(/\r?\n$/, "")
}

try {
  const senha = await lerSenha()
  if (!senha) {
    process.stderr.write("Senha vazia: nada foi gerado.\n")
    process.exit(1)
  }
  process.stdout.write(`${await gerarHashSenha(senha)}\n`)
} catch (erro) {
  process.stderr.write(
    `Não foi possível gerar o hash: ${erro instanceof Error ? erro.message : "erro desconhecido"}\n`
  )
  process.exit(1)
}
