import { TEXTOS_SAUDE } from "@/lib/config/textos-saude"
import { LINHAS_MAXIMAS, TAMANHO_MAXIMO_BYTES } from "@/lib/importacao/limites"
import type {
  CodigoProblema,
  RecusaArquivo,
} from "@/lib/importacao/tipos-importacao"

// Texto das recusas e dos problemas por linha (PRD EP-02 §7). Cita a linha ou a coluna, nunca o valor da célula
// (RF-02.14, RF-02.16, seguranca §13). Sem travessão (react-next.md §13).

const BYTES_POR_MB = 1024 * 1024
const LIMITE_EM_MB = TAMANHO_MAXIMO_BYTES / BYTES_POR_MB
const FORMATO_NUMERO = new Intl.NumberFormat("pt-BR")
const LINHAS_CITADAS = 5

function naLinha(recusa: RecusaArquivo): string {
  return recusa.linha === undefined ? "o arquivo" : `a linha ${recusa.linha}`
}

/** Mensagem da recusa do arquivo inteiro (estágio 1). */
export function mensagemDaRecusa(recusa: RecusaArquivo): string {
  switch (recusa.motivo) {
    case "EXTENSAO_INVALIDA":
      return "Arquivo recusado: só são aceitos arquivos com a extensão .csv."
    case "ARQUIVO_GRANDE_DEMAIS":
      return `Arquivo recusado: o tamanho máximo é de ${LIMITE_EM_MB} MB.`
    case "ARQUIVO_NAO_TEXTO":
      return "Arquivo recusado: o conteúdo não é texto. Envie um CSV em UTF-8."
    case "ENCODING_INVALIDO":
      return "Arquivo recusado: não está em UTF-8 e os acentos ficariam ilegíveis. Salve o CSV como UTF-8 e envie de novo."
    case "SEM_CABECALHO":
      return `Arquivo recusado: ${naLinha(recusa)} deveria ser o cabeçalho (nomes das colunas), mas tem coluna sem nome, nome repetido ou parece um dado.`
    case "SEM_LINHAS":
      return "Arquivo recusado: não há nenhuma linha de dados depois do cabeçalho."
    case "LINHAS_DEMAIS":
      return `Arquivo recusado: o limite é de ${FORMATO_NUMERO.format(LINHAS_MAXIMAS)} linhas de dados. O excesso começa em ${naLinha(recusa)}.`
    case "ASPAS_NAO_FECHADAS":
      return `Arquivo recusado: ${naLinha(recusa)} tem aspas que não foram fechadas.`
    case "SEPARADOR_MISTO":
      return `Arquivo recusado: ${naLinha(recusa)} usa outro separador (vírgula e ponto e vírgula misturados).`
    case "COLUNAS_DIVERGENTES":
      return `Arquivo recusado: ${naLinha(recusa)} tem um número de colunas diferente do cabeçalho.`
    case "DADO_PESSOAL_COLUNA":
      return TEXTOS_SAUDE.dadoPessoal.coluna(recusa.coluna ?? "")
    case "DADO_PESSOAL_VALOR":
      return TEXTOS_SAUDE.dadoPessoal.linha(recusa.linha ?? 0)
  }
}

export const MENSAGEM_DO_PROBLEMA: Record<CodigoProblema, string> = {
  PERIODO_INVALIDO: "Período inválido: use AAAA ou AAAA-MM (mês de 01 a 12).",
  GRANULARIDADE_MISTURADA:
    "Período com granularidade diferente da primeira linha válida: anos e meses não podem ser misturados.",
  CASOS_NEGATIVO:
    "Casos negativo: use um número inteiro igual ou maior que zero.",
  CASOS_DECIMAL: "Casos com decimal: use um número inteiro.",
  CASOS_NAO_NUMERICO: "Casos não é um número inteiro válido.",
  CASOS_VAZIO: "Casos vazio: a linha fica como sem dado, nunca como zero.",
  BAIRRO_VAZIO: "Bairro vazio: preencha o nome do bairro.",
  DUPLICATA:
    "Duplicata: o mesmo bairro e o mesmo período aparecem em mais de uma linha. Corrija o arquivo.",
}

/** "Linha 3", "Linhas 2 e 3", "Linhas 2, 3 e 4"; passando de 5, as demais viram "e mais N". */
export function rotuloDasLinhas(linhas: readonly number[]): string {
  if (linhas.length === 1) return `Linha ${linhas[0]}`
  const citadas = linhas.slice(0, LINHAS_CITADAS)
  const restantes = linhas.length - citadas.length
  if (restantes > 0) return `Linhas ${citadas.join(", ")} e mais ${restantes}`
  const ultima = citadas.at(-1)
  return `Linhas ${citadas.slice(0, -1).join(", ")} e ${ultima}`
}
