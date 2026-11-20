import "server-only"

const NIVEIS = ["debug", "info", "warn", "error"] as const
export type NivelLog = (typeof NIVEIS)[number]
export type CamposLog = Record<string, unknown>

const CHAVE_SENSIVEL = /senha|token|cookie|hash|authorization/i
const VALOR_REDIGIDO = "[redigido]"
const CAMPOS_FIXOS = ["ts", "nivel", "evento"]

// Lido direto do processo: o log precisa funcionar também quando o ambiente é inválido (config.invalida).
function nivelMinimo(): number {
  const configurado = NIVEIS.find((nivel) => nivel === process.env.LOG_NIVEL)
  return NIVEIS.indexOf(configurado ?? "info")
}

function ehObjetoSimples(valor: unknown): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    Object.getPrototypeOf(valor) === Object.prototype
  )
}

function serializarErro(erro: Error, visitados: WeakSet<object>): unknown {
  return redigir(
    {
      nome: erro.name,
      mensagem: erro.message,
      stack: erro.stack,
      causa: erro.cause,
    },
    visitados
  )
}

// Percorre o valor em qualquer profundidade trocando o que casa com CHAVE_SENSIVEL por VALOR_REDIGIDO.
function redigir(valor: unknown, visitados: WeakSet<object>): unknown {
  if (typeof valor === "bigint") return valor.toString()
  if (typeof valor !== "object" || valor === null) return valor
  if (visitados.has(valor)) return "[circular]"
  visitados.add(valor)
  try {
    if (valor instanceof Error) return serializarErro(valor, visitados)
    if (Array.isArray(valor))
      return valor.map((item) => redigir(item, visitados))
    if (!ehObjetoSimples(valor)) return valor
    return Object.fromEntries(
      Object.entries(valor).map(([chave, conteudo]) => [
        chave,
        CHAVE_SENSIVEL.test(chave)
          ? VALOR_REDIGIDO
          : redigir(conteudo, visitados),
      ])
    )
  } finally {
    visitados.delete(valor)
  }
}

function registrar(
  nivel: NivelLog,
  evento: string,
  campos: CamposLog = {}
): void {
  if (NIVEIS.indexOf(nivel) < nivelMinimo()) return
  const limpos = { ...(redigir(campos, new WeakSet()) as CamposLog) }
  for (const fixo of CAMPOS_FIXOS) delete limpos[fixo]
  const linha = { ts: new Date().toISOString(), nivel, evento, ...limpos }
  process.stdout.write(`${JSON.stringify(linha)}\n`)
}

export const log = {
  debug: (evento: string, campos?: CamposLog) =>
    registrar("debug", evento, campos),
  info: (evento: string, campos?: CamposLog) =>
    registrar("info", evento, campos),
  warn: (evento: string, campos?: CamposLog) =>
    registrar("warn", evento, campos),
  error: (evento: string, campos?: CamposLog) =>
    registrar("error", evento, campos),
}
