import { z } from "zod"

import { relatorioImportacaoSchema } from "@/lib/importacao/relatorio-schema"

// Contratos de leitura dos datasets (TechSpec EP-02 §4.4): a mesma definição valida o que o repositório monta e o que
// o cliente recebe dos handlers. Datas viajam como texto ISO 8601.

export const idVersaoSchema = z.uuid()

export const situacaoVersaoSchema = z.enum(["privado", "publicado"])
export type SituacaoVersao = z.infer<typeof situacaoVersaoSchema>

export const granularidadeSchema = z.enum(["ano", "mes"])

export const datasetResumoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  indicador: z.string(),
  fonte: z.string(),
  unidade: z.string(),
  proveniencia: z.literal("SINTETICO"),
  preCarregado: z.boolean(),
})
export type DatasetResumo = z.infer<typeof datasetResumoSchema>

export const versaoResumoSchema = z.object({
  id: z.string(),
  numero: z.number().int().positive(),
  situacao: situacaoVersaoSchema,
  autor: z.string(),
  importadoEm: z.iso.datetime(),
  publicadoEm: z.iso.datetime().nullable(),
  granularidade: granularidadeSchema,
  periodos: z.array(z.string()),
  linhasGravadas: z.number().int().nonnegative(),
})
export type VersaoResumo = z.infer<typeof versaoResumoSchema>

export const datasetComVersoesSchema = datasetResumoSchema.extend({
  versoes: z.array(versaoResumoSchema),
})
export type DatasetComVersoes = z.infer<typeof datasetComVersoesSchema>

export const listaDatasetsSchema = z.object({
  datasets: z.array(datasetComVersoesSchema),
})

export const relatorioVersaoSchema = z.object({
  versao: versaoResumoSchema,
  dataset: datasetResumoSchema,
  relatorio: relatorioImportacaoSchema,
})
export type RelatorioVersao = z.infer<typeof relatorioVersaoSchema>

/** Quanto ficou fora da cobertura em cada período: soma dos casos e quantas localidades (RF-02.12). */
export const foraDaCoberturaSchema = z.object({
  casos: z.number().int().nonnegative(),
  localidades: z.number().int().nonnegative(),
})
export type ForaDaCobertura = z.infer<typeof foraDaCoberturaSchema>

/** Série agregada da versão: ausência de chave = sem linha; `null` = linha com casos vazio (ambos são "sem dados"). */
export const serieSaudeSchema = z.object({
  periodos: z.array(z.string()),
  valores: z.record(
    z.string(),
    z.record(z.string(), z.number().int().nonnegative().nullable())
  ),
  foraDaCobertura: z.record(z.string(), foraDaCoberturaSchema),
})
export type SerieSaude = z.infer<typeof serieSaudeSchema>
