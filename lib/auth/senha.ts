import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto"

// Formato (TechSpec §4.3): scrypt:<N>:<r>:<p>:<sal base64url>:<hash base64url>.
// O separador é ":" porque "$" é interpolado pelo docker compose no .env.
export const FORMATO_HASH_SENHA =
  /^scrypt:\d+:\d+:\d+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/

const CUSTO_PADRAO = 16384
const BLOCO_PADRAO = 8
const PARALELISMO_PADRAO = 1
const TAMANHO_CHAVE = 64
const TAMANHO_SAL = 16
const BYTES_POR_BLOCO_SCRYPT = 128

function derivarChave(
  senha: string,
  sal: Buffer,
  tamanho: number,
  opcoes: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(senha.normalize("NFKC"), sal, tamanho, opcoes, (erro, chave) => {
      if (erro) reject(erro)
      else resolve(chave)
    })
  })
}

function opcoesScrypt(
  custo: number,
  bloco: number,
  paralelismo: number
): ScryptOptions {
  return {
    N: custo,
    r: bloco,
    p: paralelismo,
    maxmem: 2 * BYTES_POR_BLOCO_SCRYPT * custo * bloco,
  }
}

export async function gerarHashSenha(senha: string): Promise<string> {
  const sal = randomBytes(TAMANHO_SAL)
  const chave = await derivarChave(
    senha,
    sal,
    TAMANHO_CHAVE,
    opcoesScrypt(CUSTO_PADRAO, BLOCO_PADRAO, PARALELISMO_PADRAO)
  )
  const partes = [
    "scrypt",
    CUSTO_PADRAO,
    BLOCO_PADRAO,
    PARALELISMO_PADRAO,
    sal.toString("base64url"),
    chave.toString("base64url"),
  ]
  return partes.join(":")
}

// Nunca lança: hash malformado ou parâmetros que o scrypt recusa valem como "senha não confere".
export async function verificarSenha(
  senha: string,
  hash: string
): Promise<boolean> {
  if (!FORMATO_HASH_SENHA.test(hash)) return false
  const [, custo, bloco, paralelismo, sal, esperado] = hash.split(":")
  const chaveEsperada = Buffer.from(esperado, "base64url")
  // Chave vazia compararia igual a qualquer senha.
  if (chaveEsperada.length === 0) return false
  try {
    const chave = await derivarChave(
      senha,
      Buffer.from(sal, "base64url"),
      chaveEsperada.length,
      opcoesScrypt(Number(custo), Number(bloco), Number(paralelismo))
    )
    return (
      chave.length === chaveEsperada.length &&
      timingSafeEqual(chave, chaveEsperada)
    )
  } catch {
    return false
  }
}

// Troca de senha muda a impressão e invalida as sessões abertas (RF-00.23).
export function impressaoCredencial(hash: string): string {
  return createHash("sha256").update(hash).digest("hex")
}
