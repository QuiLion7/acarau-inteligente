// Nome dos arquivos baixados (TechSpec EP-05 §2, RF-05.17, CA-05.31): produto, tipo, data e bairro, só em ASCII, para o
// nome sobreviver a qualquer sistema de arquivos. Serve ao PDF, ao CSV e ao PNG.

const PRODUTO = "acarau-inteligente"
const FUSO = "America/Sao_Paulo"

// `en-CA` escreve a data como aaaa-mm-dd; o dia é o de Brasília, não o do fuso do aparelho.
const formatadorDeDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** "São José" → "sao-jose"; só letras e números ASCII em minúsculas, separados por hífen. */
export function paraTrechoDeNome(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export type EntradaNomeArquivo = {
  /** O que o arquivo é: "relatorio", "bairros", "obras"... */
  tipo: string
  data: Date
  /** Nome do bairro do filtro; ausente ou vazio = sem trecho de bairro. */
  bairro?: string | null
  extensao: "pdf" | "csv" | "png"
}

/** `acarau-inteligente_relatorio_2026-11-22_centro.pdf` (o trecho do bairro só entra com bairro filtrado). */
export function nomeArquivo({
  tipo,
  data,
  bairro,
  extensao,
}: EntradaNomeArquivo): string {
  const trechoDoBairro = bairro ? paraTrechoDeNome(bairro) : ""
  const partes = [
    PRODUTO,
    paraTrechoDeNome(tipo) || "arquivo",
    formatadorDeDia.format(data),
    trechoDoBairro,
  ].filter((parte) => parte !== "")
  return `${partes.join("_")}.${extensao}`
}
