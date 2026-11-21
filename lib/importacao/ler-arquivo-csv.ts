import { detectarDadoPessoal } from "@/lib/importacao/dado-pessoal"
import { decodificarArquivo } from "@/lib/importacao/decodificar-arquivo"
import { lerCsvEstrito } from "@/lib/importacao/ler-csv-estrito"
import type {
  EntradaArquivo,
  ResultadoLeitura,
} from "@/lib/importacao/tipos-importacao"

/**
 * Estágio 1 do motor (TechSpec EP-02 §3.1): bytes → arquivo lido ou recusado. Puro e sem I/O: roda igual no
 * navegador, a cada troca de separador, e no servidor, na confirmação (DV-23).
 */
export function lerArquivoCsv({
  nome,
  bytes,
  separador,
}: EntradaArquivo): ResultadoLeitura {
  const decodificado = decodificarArquivo(nome, bytes)
  if (decodificado.status === "recusado") {
    return { status: "recusado", motivo: decodificado.motivo }
  }

  const leitura = lerCsvEstrito({ texto: decodificado.texto, separador })
  if (leitura.status === "recusado") return leitura

  const dadoPessoal = detectarDadoPessoal(leitura.cabecalho, leitura.linhas)
  if (dadoPessoal) return { status: "recusado", ...dadoPessoal }

  return {
    status: "lido",
    arquivo: {
      nome,
      tamanhoBytes: bytes.length,
      encoding: decodificado.encoding,
      separador: leitura.separador,
      separadorDetectado: leitura.separadorDetectado,
      cabecalho: leitura.cabecalho,
      linhas: leitura.linhas,
    },
  }
}
