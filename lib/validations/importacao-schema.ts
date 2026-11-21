import { z } from "zod"

import { LINHAS_MAXIMAS } from "@/lib/importacao/limites"

// Corpo da confirmação (TechSpec EP-02 §4.2): o campo `dados` do multipart. A mesma regra serve ao formulário de
// metadados do passo de confirmar e à rota (react-next.md §6, seguranca.md §6). Unidade (`casos`) e proveniência
// (`SINTETICO`) não entram: o servidor as fixa (RF-02.06).
const BAIRRO_ID = /^uv-\d{2}$/
const NOME_NORMALIZADO_MAXIMO = 500

export const NOME_DATASET = { minimo: 3, maximo: 80 }
export const INDICADOR_DATASET = { minimo: 3, maximo: 80 }
export const FONTE_DATASET = { minimo: 3, maximo: 160 }

function comInicialMaiuscula(texto: string): string {
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`
}

function textoComLimites(
  rotulo: string,
  { minimo, maximo }: { minimo: number; maximo: number }
) {
  const sujeito = comInicialMaiuscula(rotulo)
  return z
    .string(`Informe ${rotulo}.`)
    .trim()
    .min(minimo, `${sujeito} deve ter no mínimo ${minimo} caracteres.`)
    .max(maximo, `${sujeito} deve ter no máximo ${maximo} caracteres.`)
}

const indiceDeColuna = z.number().int().min(0)

export const mapeamentoSchema = z
  .object({
    bairro: indiceDeColuna,
    periodo: indiceDeColuna,
    casos: indiceDeColuna,
  })
  .refine(
    ({ bairro, periodo, casos }) =>
      new Set([bairro, periodo, casos]).size === 3,
    "Cada campo precisa de uma coluna diferente."
  )

const nomeNormalizadoSchema = z.string().min(1).max(NOME_NORMALIZADO_MAXIMO)

export const decisaoBairroSchema = z.discriminatedUnion("tipo", [
  z.object({
    nomeNormalizado: nomeNormalizadoSchema,
    tipo: z.literal("bairro"),
    bairroId: z.string().regex(BAIRRO_ID),
  }),
  z.object({
    nomeNormalizado: nomeNormalizadoSchema,
    tipo: z.literal("fora-da-cobertura"),
  }),
])

export const metadadosDatasetSchema = z.object({
  nome: textoComLimites("o nome do dataset", NOME_DATASET),
  indicador: textoComLimites("o indicador", INDICADOR_DATASET),
  fonte: textoComLimites("a fonte", FONTE_DATASET),
})

// Escolha explícita (RF-02.22): o conteúdo novo vira dataset novo ou nova versão de um existente.
export const destinoImportacaoSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("novo") }),
  z.object({ tipo: z.literal("nova-versao"), datasetId: z.uuid() }),
])

export const confirmarImportacaoSchema = z.object({
  separador: z.enum([",", ";"]),
  mapeamento: mapeamentoSchema,
  decisoes: z.array(decisaoBairroSchema).max(LINHAS_MAXIMAS),
  metadados: metadadosDatasetSchema,
  destino: destinoImportacaoSchema,
})

export type ConfirmarImportacao = z.infer<typeof confirmarImportacaoSchema>

// Parâmetro de rota `GET /api/importacoes/conteudo/{hash}`: SHA-256 em hexadecimal minúsculo.
export const hashConteudoSchema = z.string().regex(/^[0-9a-f]{64}$/)

// Respostas dos handlers de importação (TechSpec §5), validadas no cliente na chegada.
export const conteudoImportadoSchema = z.discriminatedUnion("importado", [
  z.object({ importado: z.literal(false) }),
  z.object({
    importado: z.literal(true),
    datasetId: z.string(),
    nome: z.string(),
    numero: z.number().int().positive(),
  }),
])
export type ConteudoImportado = z.infer<typeof conteudoImportadoSchema>

export const importacaoGravadaSchema = z.object({
  datasetId: z.string(),
  versaoId: z.string(),
  numero: z.number().int().positive(),
})
export type ImportacaoGravada = z.infer<typeof importacaoGravadaSchema>
