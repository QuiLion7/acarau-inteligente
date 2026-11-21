// Arquivos de teste do motor de importação, como bytes (TechSpec EP-02 §8). Nada aqui é dado real.
import { TAMANHO_MAXIMO_BYTES } from "@/lib/importacao/limites"

const codificador = new TextEncoder()
const BOM_UTF8 = [0xef, 0xbb, 0xbf]

export function bytesUtf8(texto: string, { bom = false } = {}): Uint8Array {
  const corpo = codificador.encode(texto)
  return bom ? Uint8Array.from([...BOM_UTF8, ...corpo]) : corpo
}

/** Latin-1 de verdade: cada caractere vira um byte (acentos viram bytes que não são UTF-8 válido sozinhos). */
export function bytesLatin1(texto: string): Uint8Array {
  return Uint8Array.from(texto, (caractere) => caractere.charCodeAt(0))
}

/** Cabeçalho PNG: tem bytes NUL logo no início, como qualquer imagem. */
export const BYTES_PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52,
])

export function csvComLinhas(quantidade: number): string {
  const linhas = Array.from(
    { length: quantidade },
    (_, indice) => `Centro,${2000 + indice},1`
  )
  return ["bairro,ano,casos", ...linhas].join("\n")
}

/** CSV válido com exatamente `bytes` bytes (UTF-8), esticando o nome do bairro da única linha de dados. */
export function csvComTamanho(bytes: number): Uint8Array {
  const moldura = "bairro,ano,casos\n,2025,1\n"
  const preenchimento = "x".repeat(bytes - codificador.encode(moldura).length)
  return bytesUtf8(`bairro,ano,casos\n${preenchimento},2025,1\n`)
}

export function csvNoLimiteDeTamanho(): Uint8Array {
  return csvComTamanho(TAMANHO_MAXIMO_BYTES)
}

export const ROTEIRO_PONTO_E_VIRGULA = [
  "bairro;ano;casos",
  "Centro;2025;12",
  "São Benedito;2025;7",
  "",
].join("\r\n")
