import { TAMANHO_MAXIMO_BYTES } from "@/lib/importacao/limites"
import type { Encoding, MotivoRecusa } from "@/lib/importacao/tipos-importacao"

const EXTENSAO_CSV = ".csv"
const BOM_UTF8 = [0xef, 0xbb, 0xbf] as const

export type ArquivoDecodificado =
  | { status: "decodificado"; texto: string; encoding: Encoding }
  | { status: "recusado"; motivo: MotivoRecusa }

function temBom(bytes: Uint8Array): boolean {
  return BOM_UTF8.every((byte, indice) => bytes[indice] === byte)
}

// Byte NUL não aparece em texto: é o que separa imagem, planilha binária e outros formatos de um `.csv` de verdade.
// O arquivo todo é conferido (e não só o começo): o Postgres recusa NUL em `text`, e um NUL perdido no meio viraria
// erro 500 na gravação em vez de recusa do arquivo.
function pareceBinario(bytes: Uint8Array): boolean {
  return bytes.includes(0)
}

/** Extensão, tamanho, "é texto" e UTF-8 estrito (RF-02.02, RF-02.03). Arquivo em Latin-1 com acento é recusado. */
export function decodificarArquivo(
  nome: string,
  bytes: Uint8Array
): ArquivoDecodificado {
  if (!nome.toLowerCase().endsWith(EXTENSAO_CSV)) {
    return { status: "recusado", motivo: "EXTENSAO_INVALIDA" }
  }
  if (bytes.length > TAMANHO_MAXIMO_BYTES) {
    return { status: "recusado", motivo: "ARQUIVO_GRANDE_DEMAIS" }
  }
  if (pareceBinario(bytes)) {
    return { status: "recusado", motivo: "ARQUIVO_NAO_TEXTO" }
  }

  const comBom = temBom(bytes)
  const conteudo = comBom ? bytes.subarray(BOM_UTF8.length) : bytes
  try {
    // `ignoreBOM: true` evita que o decodificador remova um segundo BOM em silêncio: só o primeiro é tratado aqui.
    const texto = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    }).decode(conteudo)
    return {
      status: "decodificado",
      texto,
      encoding: comBom ? "UTF-8 com BOM" : "UTF-8",
    }
  } catch {
    return { status: "recusado", motivo: "ENCODING_INVALIDO" }
  }
}
