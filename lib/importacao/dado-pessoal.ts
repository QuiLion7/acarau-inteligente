import type { LinhaLida } from "@/lib/importacao/tipos-importacao"
import { normalizarParaBusca } from "@/lib/territorio/nome-bairro"

// Indício de dado pessoal (RF-02.16, RN-02.07, PR-07): termos no cabeçalho e CPF formatado em célula. Não pretende
// ser completo. A recusa cita a coluna ou a linha, nunca o valor.

const TERMOS_PROIBIDOS = new Set([
  "cpf",
  "cns",
  "rg",
  "paciente",
  "nascimento",
  "endereco",
  "logradouro",
  "telefone",
  "celular",
  "email",
  "latitude",
  "longitude",
  "lat",
  "lon",
  "lng",
])
// "sus" só denuncia dado pessoal junto de "cartao" (cartão SUS); sozinho é a sigla do sistema de saúde.
const TERMO_CARTAO = "cartao"
const TERMO_SUS = "sus"
// "nome" é proibido a menos que a coluna diga que é de lugar.
const TERMO_NOME = "nome"
const TERMOS_DE_LUGAR = new Set(["bairro", "uv", "localidade"])

// Ancorada e sem repetição aninhada: não há retrocesso explosivo em célula hostil (seguranca §13).
const CPF_FORMATADO = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/

export type DadoPessoalDetectado =
  | { motivo: "DADO_PESSOAL_COLUNA"; coluna: string }
  | { motivo: "DADO_PESSOAL_VALOR"; linha: number }

function ehAlfanumerico(caractere: string): boolean {
  return (
    (caractere >= "a" && caractere <= "z") ||
    (caractere >= "0" && caractere <= "9")
  )
}

// Quebra em qualquer caractere que não seja letra ou dígito (`nome_paciente`, `Nome do Paciente`), sem regex.
function termosDoCabecalho(coluna: string): string[] {
  const termos: string[] = []
  let atual = ""
  for (const caractere of normalizarParaBusca(coluna)) {
    if (ehAlfanumerico(caractere)) {
      atual += caractere
      continue
    }
    if (atual !== "") termos.push(atual)
    atual = ""
  }
  if (atual !== "") termos.push(atual)
  return termos
}

function colunaTemDadoPessoal(coluna: string): boolean {
  const termos = termosDoCabecalho(coluna)
  if (termos.some((termo) => TERMOS_PROIBIDOS.has(termo))) return true
  if (termos.includes(TERMO_SUS) && termos.includes(TERMO_CARTAO)) return true
  const nomeDePessoa =
    termos.includes(TERMO_NOME) &&
    !termos.some((termo) => TERMOS_DE_LUGAR.has(termo))
  return nomeDePessoa
}

function ehCpfFormatado(celula: string): boolean {
  return CPF_FORMATADO.test(celula.trim())
}

/** Cabeçalho primeiro; depois a primeira linha com um CPF formatado em qualquer célula. */
export function detectarDadoPessoal(
  cabecalho: readonly string[],
  linhas: readonly LinhaLida[]
): DadoPessoalDetectado | null {
  const coluna = cabecalho.find(colunaTemDadoPessoal)
  if (coluna !== undefined) return { motivo: "DADO_PESSOAL_COLUNA", coluna }
  const comCpf = linhas.find(({ celulas }) => celulas.some(ehCpfFormatado))
  if (comCpf) return { motivo: "DADO_PESSOAL_VALOR", linha: comCpf.numero }
  return null
}
