import { LINHAS_MAXIMAS } from "@/lib/importacao/limites"
import type {
  LinhaLida,
  MotivoRecusa,
  Separador,
} from "@/lib/importacao/tipos-importacao"
import { normalizarParaBusca } from "@/lib/territorio/nome-bairro"

// Leitor de CSV estrito (RF-02.03, RF-02.17, RF-02.18): máquina de estados, sem regex. Ao contrário do leitor do
// território (DEC-T-03), nunca completa nem corrige nada: o que estiver fora do formato vira recusa com a linha.

const ASPAS = '"'
const PREFIXO_ESCAPE_FORMULA = "'"
const INICIOS_DE_FORMULA = new Set(["=", "+", "-", "@", "\t", "\r"])
const OUTRO_SEPARADOR: Record<Separador, Separador> = { ",": ";", ";": "," }

type Registro = { celulas: string[]; fim: number }
type FalhaDeAspas = { falhaDeAspas: true; abertura: number }
type CelulaLida = {
  valor: string
  proximo: number
  terminou: "separador" | "linha" | "texto"
}

export type RecusaLeitura = {
  status: "recusado"
  motivo: MotivoRecusa
  linha: number
}

export type LeituraEstrita =
  | RecusaLeitura
  | {
      status: "lido"
      separador: Separador
      separadorDetectado: Separador
      cabecalho: string[]
      linhas: LinhaLida[]
    }

function ehQuebra(caractere: string | undefined): boolean {
  return caractere === "\n" || caractere === "\r"
}

// `\r\n` conta como uma quebra só, como em `lerCelula`.
function contarQuebras(texto: string, de: number, ate: number): number {
  let quebras = 0
  for (let indice = de; indice < ate; indice++) {
    if (!ehQuebra(texto[indice])) continue
    if (texto[indice] === "\r" && texto[indice + 1] === "\n") indice += 1
    quebras += 1
  }
  return quebras
}

function lerCelulaEntreAspas(
  texto: string,
  abertura: number,
  separador: Separador
): CelulaLida | FalhaDeAspas {
  let valor = ""
  for (let indice = abertura + 1; indice < texto.length; indice++) {
    const caractere = texto[indice]
    if (caractere !== ASPAS) {
      valor += caractere
      continue
    }
    if (texto[indice + 1] === ASPAS) {
      valor += ASPAS
      indice += 1
      continue
    }
    return terminarCelula(texto, valor, indice + 1, separador, abertura)
  }
  return { falhaDeAspas: true, abertura }
}

// Depois da aspa que fecha, só pode vir o separador, a quebra ou o fim: qualquer outra coisa é aspas mal formada.
function terminarCelula(
  texto: string,
  valor: string,
  proximo: number,
  separador: Separador,
  abertura: number
): CelulaLida | FalhaDeAspas {
  const caractere = texto[proximo]
  if (caractere === undefined) return { valor, proximo, terminou: "texto" }
  if (caractere === separador) {
    return { valor, proximo: proximo + 1, terminou: "separador" }
  }
  if (!ehQuebra(caractere)) return { falhaDeAspas: true, abertura }
  const avanco = caractere === "\r" && texto[proximo + 1] === "\n" ? 2 : 1
  return { valor, proximo: proximo + avanco, terminou: "linha" }
}

function lerCelulaSemAspas(
  texto: string,
  inicio: number,
  separador: Separador
): CelulaLida {
  let indice = inicio
  while (indice < texto.length) {
    const caractere = texto[indice]
    if (caractere === separador || ehQuebra(caractere)) break
    indice += 1
  }
  const valor = texto.slice(inicio, indice)
  const caractere = texto[indice]
  if (caractere === undefined)
    return { valor, proximo: indice, terminou: "texto" }
  if (caractere === separador) {
    return { valor, proximo: indice + 1, terminou: "separador" }
  }
  const avanco = caractere === "\r" && texto[indice + 1] === "\n" ? 2 : 1
  return { valor, proximo: indice + avanco, terminou: "linha" }
}

function lerRegistro(
  texto: string,
  inicio: number,
  separador: Separador
): Registro | FalhaDeAspas {
  const celulas: string[] = []
  let posicao = inicio
  for (;;) {
    const celula =
      texto[posicao] === ASPAS
        ? lerCelulaEntreAspas(texto, posicao, separador)
        : lerCelulaSemAspas(texto, posicao, separador)
    if ("falhaDeAspas" in celula) return celula
    celulas.push(celula.valor)
    posicao = celula.proximo
    if (celula.terminou !== "separador") return { celulas, fim: posicao }
  }
}

function ehLinhaEmBranco(texto: string, inicio: number, fim: number): boolean {
  return texto.slice(inicio, fim).trim() === ""
}

/** Cada célula que começa com `'` + `= + - @ TAB CR` perde o `'` (RF-02.18; ida e volta com a exportação). */
export function desfazerEscapeDeFormula(celula: string): string {
  const temEscape =
    celula.startsWith(PREFIXO_ESCAPE_FORMULA) &&
    INICIOS_DE_FORMULA.has(celula.charAt(1))
  return temEscape ? celula.slice(1) : celula
}

// Em caso de falha de parse o separador errado vale como "uma coluna": a contagem decide, e o erro de verdade sai
// depois, na leitura com o separador escolhido.
function quantidadeDeColunas(
  texto: string,
  inicio: number,
  separador: Separador
): number {
  const registro = lerRegistro(texto, inicio, separador)
  return "falhaDeAspas" in registro ? 1 : registro.celulas.length
}

function detectarSeparador(texto: string, inicio: number): Separador {
  const comVirgula = quantidadeDeColunas(texto, inicio, ",")
  const comPontoEVirgula = quantidadeDeColunas(texto, inicio, ";")
  return comPontoEVirgula > comVirgula ? ";" : ","
}

// Linha física: vai até a quebra (inclusive), sem olhar aspas; serve só para pular linhas em branco.
function fimDaLinhaFisica(texto: string, inicio: number): number {
  let indice = inicio
  while (indice < texto.length && !ehQuebra(texto[indice])) indice += 1
  if (indice >= texto.length) return texto.length
  return texto[indice] === "\r" && texto[indice + 1] === "\n"
    ? indice + 2
    : indice + 1
}

function proximaLinhaComConteudo(texto: string, inicio: number): number {
  let posicao = inicio
  while (posicao < texto.length) {
    const fim = fimDaLinhaFisica(texto, posicao)
    if (!ehLinhaEmBranco(texto, posicao, fim)) return posicao
    posicao = fim
  }
  return texto.length
}

type CabecalhoLido = {
  cabecalho: string[]
  linha: number
  /** Posição e número da primeira linha depois do cabeçalho. */
  proximo: number
  linhaSeguinte: number
}

function recusa(motivo: MotivoRecusa, linha: number): RecusaLeitura {
  return { status: "recusado", motivo, linha }
}

function cabecalhoInvalido(cabecalho: readonly string[]): boolean {
  const normalizados = cabecalho.map(normalizarParaBusca)
  const repetido = new Set(normalizados).size !== normalizados.length
  return (
    repetido || normalizados.some((celula) => celula === "" || soNumero(celula))
  )
}

// Cabeçalho que parece dado (só dígitos e pontuação numérica) indica arquivo sem cabeçalho (RF-02.17).
function soNumero(celula: string): boolean {
  for (const caractere of celula) {
    const ehDigito = caractere >= "0" && caractere <= "9"
    if (!ehDigito && !".,-+ ".includes(caractere)) return false
  }
  return true
}

function lerCabecalho(
  texto: string,
  separador: Separador
): CabecalhoLido | RecusaLeitura {
  const inicio = proximaLinhaComConteudo(texto, 0)
  // Arquivo vazio ou só com linhas em branco: não há linha de cabeçalho, então a recusa aponta a primeira.
  if (inicio >= texto.length) return recusa("SEM_CABECALHO", 1)
  const linha = 1 + contarQuebras(texto, 0, inicio)
  const registro = lerRegistro(texto, inicio, separador)
  if ("falhaDeAspas" in registro) {
    return recusa(
      "ASPAS_NAO_FECHADAS",
      linha + contarQuebras(texto, inicio, registro.abertura)
    )
  }
  const cabecalho = registro.celulas.map((celula) =>
    desfazerEscapeDeFormula(celula).trim()
  )
  if (cabecalhoInvalido(cabecalho)) {
    return recusa("SEM_CABECALHO", linha)
  }
  return {
    cabecalho,
    linha,
    proximo: registro.fim,
    linhaSeguinte: linha + contarQuebras(texto, inicio, registro.fim),
  }
}

// Contagem errada que daria a certa com o outro separador: o arquivo mistura `,` e `;` (RF-02.17).
function motivoDeColunasErradas(
  trecho: { texto: string; inicio: number; fim: number },
  separador: Separador,
  colunasEsperadas: number
): MotivoRecusa {
  const registro = lerRegistro(
    trecho.texto.slice(trecho.inicio, trecho.fim),
    0,
    OUTRO_SEPARADOR[separador]
  )
  const serviriaOutro =
    !("falhaDeAspas" in registro) &&
    registro.celulas.length === colunasEsperadas
  return serviriaOutro ? "SEPARADOR_MISTO" : "COLUNAS_DIVERGENTES"
}

type ProblemaDeLinha = "LINHAS_DEMAIS" | "COLUNAS" | null

function problemaDaLinha(
  colunas: number,
  linhasJaLidas: number,
  colunasEsperadas: number
): ProblemaDeLinha {
  if (linhasJaLidas === LINHAS_MAXIMAS) return "LINHAS_DEMAIS"
  return colunas === colunasEsperadas ? null : "COLUNAS"
}

function lerLinhasDeDados(
  texto: string,
  separador: Separador,
  cabecalho: CabecalhoLido
): LinhaLida[] | RecusaLeitura {
  const colunasEsperadas = cabecalho.cabecalho.length
  const linhas: LinhaLida[] = []
  let posicao = cabecalho.proximo
  let numero = cabecalho.linhaSeguinte
  while (posicao < texto.length) {
    const registro = lerRegistro(texto, posicao, separador)
    if ("falhaDeAspas" in registro) {
      const abertura = contarQuebras(texto, posicao, registro.abertura)
      return recusa("ASPAS_NAO_FECHADAS", numero + abertura)
    }
    if (!ehLinhaEmBranco(texto, posicao, registro.fim)) {
      const problema = problemaDaLinha(
        registro.celulas.length,
        linhas.length,
        colunasEsperadas
      )
      if (problema === "LINHAS_DEMAIS") return recusa(problema, numero)
      if (problema === "COLUNAS") {
        const motivo = motivoDeColunasErradas(
          { texto, inicio: posicao, fim: registro.fim },
          separador,
          colunasEsperadas
        )
        return recusa(motivo, numero)
      }
      linhas.push({
        numero,
        celulas: registro.celulas.map(desfazerEscapeDeFormula),
      })
    }
    numero += contarQuebras(texto, posicao, registro.fim)
    posicao = registro.fim
  }
  return linhas
}

type EntradaLeitura = { texto: string; separador?: Separador }

/**
 * Lê o texto inteiro ou recusa com o motivo e a linha. Linhas em branco são ignoradas e não contam; o número da
 * linha é o do arquivo. Nunca devolve o valor de uma célula na recusa (seguranca §13).
 */
export function lerCsvEstrito({
  texto,
  separador: forcado,
}: EntradaLeitura): LeituraEstrita {
  const separadorDetectado = detectarSeparador(
    texto,
    proximaLinhaComConteudo(texto, 0)
  )
  const separador = forcado ?? separadorDetectado

  const cabecalho = lerCabecalho(texto, separador)
  if ("status" in cabecalho) return cabecalho
  const linhas = lerLinhasDeDados(texto, separador, cabecalho)
  if ("status" in linhas) return linhas
  if (linhas.length === 0) return recusa("SEM_LINHAS", cabecalho.linha)
  return {
    status: "lido",
    separador,
    separadorDetectado,
    cabecalho: cabecalho.cabecalho,
    linhas,
  }
}
