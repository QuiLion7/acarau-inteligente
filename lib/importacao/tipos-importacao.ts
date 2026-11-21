// Contratos do motor de importação (TechSpec EP-02 §4.1). Só tipos: o motor é puro e roda no navegador e no Node.
import type { BairroResumo } from "@/lib/territorio/artefato-schema"

export type Separador = "," | ";"

export type Encoding = "UTF-8" | "UTF-8 com BOM"

/** Recusa do arquivo inteiro (estágio 1). Nenhum motivo carrega o valor de uma célula. */
export type MotivoRecusa =
  | "EXTENSAO_INVALIDA"
  | "ARQUIVO_GRANDE_DEMAIS"
  | "ARQUIVO_NAO_TEXTO"
  | "ENCODING_INVALIDO"
  | "SEM_CABECALHO"
  | "SEM_LINHAS"
  | "LINHAS_DEMAIS"
  | "ASPAS_NAO_FECHADAS"
  | "SEPARADOR_MISTO"
  | "COLUNAS_DIVERGENTES"
  | "DADO_PESSOAL_COLUNA"
  | "DADO_PESSOAL_VALOR"

export type RecusaArquivo = {
  motivo: MotivoRecusa
  /** Número da linha no arquivo (cabeçalho = 1 quando não há linha em branco antes). */
  linha?: number
  /** Nome da coluna no cabeçalho, só em `DADO_PESSOAL_COLUNA`. */
  coluna?: string
}

export type LinhaLida = { numero: number; celulas: string[] }

export type ArquivoLido = {
  nome: string
  tamanhoBytes: number
  encoding: Encoding
  /** Detectado no cabeçalho ou forçado pelo analista. */
  separador: Separador
  /** Para a prévia mostrar "detectado: ;" mesmo depois da troca. */
  separadorDetectado: Separador
  cabecalho: string[]
  /** Células sem o escape de fórmula (RF-02.18). */
  linhas: LinhaLida[]
}

export type EntradaArquivo = {
  nome: string
  bytes: Uint8Array
  separador?: Separador
}

export type ResultadoLeitura =
  | ({ status: "recusado" } & RecusaArquivo)
  | { status: "lido"; arquivo: ArquivoLido }

// ---- Estágio 2: análise (TechSpec EP-02 §4.1) ----

export type CampoMapeado = "bairro" | "periodo" | "casos"

/** Índice da coluna de cada campo; obrigatórios e distintos. */
export type MapeamentoColunas = Record<CampoMapeado, number>

/** O assistente deixa o analista desmarcar um campo: `null` é "ainda sem coluna". */
export type MapeamentoParcial = Record<CampoMapeado, number | null>

export type CorrespondenciaNome =
  | { estado: "reconhecido"; bairroId: string; origem: "automatica" }
  | { estado: "ambiguo"; candidatos: BairroResumo[] }
  | { estado: "nao-reconhecido" }

/** Vale para todas as linhas com o mesmo nome normalizado (RF-02.11). */
export type DecisaoBairro =
  | { nomeNormalizado: string; tipo: "bairro"; bairroId: string }
  | { nomeNormalizado: string; tipo: "fora-da-cobertura" }

/** Para onde as linhas de um nome vão: um dos 24 bairros ou fora da cobertura (sem geometria, RN-003). */
export type DestinoNome =
  | { tipo: "bairro"; bairroId: string; origem: "automatica" | "manual" }
  | { tipo: "fora-da-cobertura"; origem: "manual" }

export type CodigoProblema =
  | "PERIODO_INVALIDO"
  | "GRANULARIDADE_MISTURADA"
  | "CASOS_NEGATIVO"
  | "CASOS_DECIMAL"
  | "CASOS_NAO_NUMERICO"
  | "CASOS_VAZIO"
  | "BAIRRO_VAZIO"
  | "DUPLICATA"

export type SeveridadeProblema = "erro" | "aviso"

/** Nunca leva o valor da célula (RF-02.14, seguranca §13). */
export type ProblemaLinha = {
  linhas: number[]
  codigo: CodigoProblema
  severidade: SeveridadeProblema
}

export type Granularidade = "ano" | "mes"

export type NomeDistinto = {
  nomeOriginal: string
  nomeNormalizado: string
  /** Quantas linhas do arquivo têm este nome. */
  linhas: number
  correspondencia: CorrespondenciaNome
  /** A decisão do analista que vale (ignorada quando o `bairroId` não é um dos 24). */
  decisao: DecisaoBairro | null
  /** `null` = pendente: ambíguo ou não reconhecido, ainda sem decisão. */
  destino: DestinoNome | null
}

/** O que o servidor grava em `dataset_linha` (TechSpec §4.6). */
export type LinhaNormalizada = {
  linhaArquivo: number
  /** `null` = fora da cobertura. */
  bairroId: string | null
  nomeOriginal: string
  periodo: string
  /** `null` = sem dado (célula vazia), nunca `0`. */
  casos: number | null
}

export type ResumoAnalise = {
  lidas: number
  /** Linhas sem erro (as com aviso incluídas). */
  validas: number
  comAviso: number
  comErro: number
  semDado: number
  foraDaCobertura: number
  /** Linhas atingidas por motivo (uma duplicata de 2 linhas conta 2). */
  porMotivo: Record<CodigoProblema, number>
}

export type AnaliseImportacao = {
  mapeamento: MapeamentoParcial
  colunasIgnoradas: string[]
  nomes: NomeDistinto[]
  /** Erros antes de avisos; dentro de cada grupo, pela linha. */
  problemas: ProblemaLinha[]
  resumo: ResumoAnalise
  granularidade: Granularidade | null
  periodos: string[]
  pendencias: number
  podeConfirmar: boolean
  linhasNormalizadas: LinhaNormalizada[]
}

/** Análise sem pendência nem erro, pronta para ser gravada: mapeamento completo e granularidade definida. */
export type AnaliseConfirmavel = AnaliseImportacao & {
  mapeamento: MapeamentoColunas
  granularidade: Granularidade
  podeConfirmar: true
}
