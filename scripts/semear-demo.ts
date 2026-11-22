// Semeadura do ambiente publicado (TechSpec EP-05 §2, DEC-T-06, DEC-T-15): grava o dataset e as obras de exemplo que
// ainda não existem e sai com 1 se falhar, o que derruba a publicação. Idempotente.
// Uso: npm run demo:semear (DATABASE_URL = URL direta do banco, nunca a do pooler)
import { criarBanco } from "../lib/server/db/cliente"
import { semearDemo } from "../lib/server/demo/semear-demo"
import { log } from "../lib/server/log"

async function principal(): Promise<number> {
  const url = process.env.DATABASE_URL
  if (!url) {
    log.error("demo.semeadura_falhou", { motivo: "DATABASE_URL ausente" })
    return 1
  }
  const banco = criarBanco(url, 1)
  try {
    await semearDemo(banco, new Date())
    return 0
  } catch (erro) {
    log.error("demo.semeadura_falhou", { erro })
    return 1
  } finally {
    await banco.$client.end()
  }
}

process.exitCode = await principal()
