import { z } from "zod"

// Relatório de processamento (TechSpec EP-02 §4.3, RF-02.23): gravado em `dataset_versao.relatorio` (jsonb), lido
// inteiro e validado aqui na saída do banco; exibido no cliente. Autor, data, versão, indicador, fonte e proveniência
// ficam nas colunas da versão e do dataset.
const HASH_SHA256 = /^[0-9a-f]{64}$/

const destinoDecidoSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("bairro"),
    bairroId: z.string(),
    nome: z.string(),
  }),
  z.object({ tipo: z.literal("fora-da-cobertura") }),
])

const decisaoBairroSchema = z.object({
  nomeOriginal: z.string(),
  destino: destinoDecidoSchema,
  origem: z.enum(["automatica", "manual"]),
  linhas: z.number().int().nonnegative(),
})

export const relatorioImportacaoSchema = z.object({
  nomeArquivo: z.string(),
  hashConteudo: z.string().regex(HASH_SHA256),
  separador: z.enum([",", ";"]),
  encoding: z.enum(["UTF-8", "UTF-8 com BOM"]),
  /** Nomes das colunas do arquivo, não os índices. */
  mapeamento: z.object({
    bairro: z.string(),
    periodo: z.string(),
    casos: z.string(),
  }),
  colunasIgnoradas: z.array(z.string()),
  decisoesBairro: z.array(decisaoBairroSchema),
  contagens: z.object({
    lidas: z.number().int().nonnegative(),
    gravadas: z.number().int().nonnegative(),
    semDado: z.number().int().nonnegative(),
    foraDaCobertura: z.number().int().nonnegative(),
    avisos: z.number().int().nonnegative(),
  }),
  granularidade: z.enum(["ano", "mes"]),
  periodos: z.array(z.string()),
})

export type RelatorioImportacao = z.infer<typeof relatorioImportacaoSchema>
