// Apoio dos testes da análise: lê o texto pelo estágio 1 e analisa com os 24 bairros reais do território.
import { bytesUtf8 } from "@/lib/importacao/__fixtures__/csv-bytes"
import { analisarImportacao } from "@/lib/importacao/analisar-importacao"
import { lerArquivoCsv } from "@/lib/importacao/ler-arquivo-csv"
import type {
  AnaliseImportacao,
  ArquivoLido,
  DecisaoBairro,
  MapeamentoParcial,
} from "@/lib/importacao/tipos-importacao"
import { listarResumoBairros } from "@/lib/server/territorio/territorio-repositorio"

export const BAIRROS = listarResumoBairros()

export function lerTexto(texto: string, nome = "casos.csv"): ArquivoLido {
  const resultado = lerArquivoCsv({ nome, bytes: bytesUtf8(texto) })
  if (resultado.status !== "lido") {
    throw new Error(`fixture de teste recusada: ${resultado.motivo}`)
  }
  return resultado.arquivo
}

type OpcoesDeAnalise = {
  mapeamento?: MapeamentoParcial | null
  decisoes?: DecisaoBairro[]
}

export function analisarTexto(
  texto: string,
  { mapeamento = null, decisoes = [] }: OpcoesDeAnalise = {}
): AnaliseImportacao {
  return analisarImportacao({
    arquivo: lerTexto(texto),
    mapeamento,
    decisoes,
    bairros: BAIRROS,
  })
}

export function csv(...linhas: string[]): string {
  return ["bairro,ano,casos", ...linhas].join("\n")
}
