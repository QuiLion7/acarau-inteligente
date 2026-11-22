import { z } from "zod"

import { FORMATO_HASH_SENHA } from "@/lib/auth/senha"

const NIVEIS_LOG = ["debug", "info", "warn", "error"] as const

const texto = z.string().trim().min(1)
const hashSenha = z.string().regex(FORMATO_HASH_SENHA)
const urlValida = z.url()

function inteiroPositivo(padrao: number) {
  return z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().positive())
    .optional()
    .transform((valor) => valor ?? padrao)
}

// Booleano por texto: só "true" e "false" valem (qualquer outro valor é erro de configuração).
function booleano(padrao: boolean) {
  return z
    .enum(["true", "false"])
    .optional()
    .transform((valor) => (valor === undefined ? padrao : valor === "true"))
}

const esquemaAmbiente = z
  .object({
    DATABASE_URL: urlValida,
    APP_URL: urlValida,
    DEMO_ANALISTA_USUARIO: texto,
    DEMO_ANALISTA_NOME: texto,
    DEMO_ANALISTA_SENHA_HASH: hashSenha,
    DEMO_ADMIN_USUARIO: texto,
    DEMO_ADMIN_NOME: texto,
    DEMO_ADMIN_SENHA_HASH: hashSenha,
    SESSAO_INATIVIDADE_MIN: inteiroPositivo(120),
    LOGIN_MAX_FALHAS: inteiroPositivo(5),
    LOGIN_JANELA_MIN: inteiroPositivo(15),
    LOGIN_BLOQUEIO_MIN: inteiroPositivo(15),
    LOG_NIVEL: z.enum(NIVEIS_LOG).default("info"),
    // `false` na Vercel: a carga do exemplo é do `demo:semear`, não de cada subida (DEC-T-06).
    PRE_CARREGAR_NA_SUBIDA: booleano(true),
    // Conexões por instância; na Vercel, 3 com a URL do pooler (RF-05.32).
    DB_POOL_MAX: inteiroPositivo(10),
  })
  .superRefine((valores, contexto) => {
    const analista = valores.DEMO_ANALISTA_USUARIO.toLowerCase()
    const administrador = valores.DEMO_ADMIN_USUARIO.toLowerCase()
    if (analista === administrador) {
      contexto.addIssue({
        code: "custom",
        path: ["DEMO_ADMIN_USUARIO"],
        message: "repetido",
      })
    }
  })

export type Ambiente = z.infer<typeof esquemaAmbiente>
export type FonteAmbiente = Readonly<Record<string, string | undefined>>

export class ErroAmbiente extends Error {
  readonly variaveis: string[]

  constructor(variaveis: string[]) {
    super(
      `Configuração inválida. Verifique as variáveis: ${variaveis.join(", ")}`
    )
    this.name = "ErroAmbiente"
    this.variaveis = variaveis
  }
}

// Espaços nas pontas saem e variável em branco (`VAR=` no .env) vale como ausente.
function semVazios(fonte: FonteAmbiente): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(fonte).map(([nome, valor]) => [
      nome,
      valor?.trim() || undefined,
    ])
  )
}

function validar(fonte: FonteAmbiente): Ambiente {
  const resultado = esquemaAmbiente.safeParse(semVazios(fonte))
  if (resultado.success) return resultado.data
  // Só os nomes entram no erro: o valor de uma variável inválida pode ser segredo.
  const nomes = resultado.error.issues.map((problema) =>
    String(problema.path[0])
  )
  throw new ErroAmbiente([...new Set(nomes)])
}

let memoizado: Ambiente | undefined

export function lerAmbiente(fonte?: FonteAmbiente): Ambiente {
  if (fonte) return validar(fonte)
  memoizado ??= validar(process.env)
  return memoizado
}
