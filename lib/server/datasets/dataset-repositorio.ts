import "server-only"

import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm"

import { temPapel, type Papel } from "@/lib/auth/papeis"
import type { OpcaoDeVersao } from "@/lib/saude/analise-dataset"
import { relatorioImportacaoSchema } from "@/lib/importacao/relatorio-schema"
import type { Banco, Executor } from "@/lib/server/db/cliente"
import { dataset, datasetLinha, datasetVersao } from "@/lib/server/db/schema"
import {
  datasetComVersoesSchema,
  datasetResumoSchema,
  serieSaudeSchema,
  situacaoVersaoSchema,
  versaoResumoSchema,
  type DatasetComVersoes,
  type DatasetResumo,
  type RelatorioVersao,
  type SerieSaude,
  type VersaoResumo,
} from "@/lib/validations/datasets-schema"

export type ReferenciaVersao = {
  datasetId: string
  versaoId: string
  nome: string
  numero: number
}

/** Versão com o dataset a que pertence: o que a Saúde precisa para identificar o que mostra (RF-02.29). */
export type VersaoDoDataset = { versao: VersaoResumo; dataset: DatasetResumo }

/**
 * `nao-encontrada` não distingue "não existe" de "existe e é privada" para quem não é analista (CA-02.18): nenhum
 * campo, status ou log pode revelar a existência da versão.
 */
export type ResultadoVersaoVisivel =
  | ({ status: "ok" } & VersaoDoDataset)
  | { status: "nenhum-dataset" }
  | { status: "nao-encontrada" }

export type DatasetPublicado = {
  dataset: DatasetResumo
  versao: VersaoResumo
}

const COLUNAS_DO_DATASET = {
  id: dataset.id,
  nome: dataset.nome,
  indicador: dataset.indicador,
  fonte: dataset.fonte,
  unidade: dataset.unidade,
  proveniencia: dataset.proveniencia,
  preCarregado: dataset.preCarregado,
}

const COLUNAS_DA_VERSAO = {
  id: datasetVersao.id,
  numero: datasetVersao.numero,
  situacao: datasetVersao.situacao,
  autor: datasetVersao.autorNome,
  importadoEm: datasetVersao.importadoEm,
  publicadoEm: datasetVersao.publicadoEm,
  granularidade: datasetVersao.granularidade,
  periodos: datasetVersao.periodos,
  linhasGravadas: datasetVersao.linhasGravadas,
}

type LinhaDaVersao = {
  id: string
  numero: number
  situacao: string
  autor: string
  importadoEm: Date
  publicadoEm: Date | null
  granularidade: string
  periodos: string[]
  linhasGravadas: number
}

function paraVersaoResumo(linha: LinhaDaVersao): VersaoResumo {
  return versaoResumoSchema.parse({
    ...linha,
    importadoEm: linha.importadoEm.toISOString(),
    publicadoEm: linha.publicadoEm?.toISOString() ?? null,
  })
}

/** Uma versão pelo id, na forma do contrato; `null` se não existe. */
export async function obterVersaoResumo(
  leitor: Executor,
  versaoId: string
): Promise<VersaoResumo | null> {
  const [linha] = await leitor
    .select(COLUNAS_DA_VERSAO)
    .from(datasetVersao)
    .where(eq(datasetVersao.id, versaoId))
  return linha ? paraVersaoResumo(linha) : null
}

/** A versão que já tem este conteúdo (SHA-256 dos bytes, DEC-T-02), ou `null`. */
export async function buscarVersaoPorHash(
  banco: Executor,
  hash: string
): Promise<ReferenciaVersao | null> {
  const [referencia] = await banco
    .select({
      datasetId: dataset.id,
      versaoId: datasetVersao.id,
      nome: dataset.nome,
      numero: datasetVersao.numero,
    })
    .from(datasetVersao)
    .innerJoin(dataset, eq(dataset.id, datasetVersao.datasetId))
    .where(eq(datasetVersao.hashConteudo, hash))
    .limit(1)
  return referencia ?? null
}

/**
 * Todos os datasets com suas versões (RF-02.25): datasets da última importação para a mais antiga, versões do número
 * maior para o menor (§4.4). Sem paginação: a demo tem poucos datasets (R-06).
 */
export async function listarDatasets(
  banco: Banco
): Promise<DatasetComVersoes[]> {
  const conjuntos = await banco.select(COLUNAS_DO_DATASET).from(dataset)
  const versoes = await banco
    .select({ datasetId: datasetVersao.datasetId, ...COLUNAS_DA_VERSAO })
    .from(datasetVersao)
    .orderBy(desc(datasetVersao.numero))

  const resumos = conjuntos.map((conjunto) => ({
    ...conjunto,
    versoes: versoes
      .filter(({ datasetId }) => datasetId === conjunto.id)
      .map(paraVersaoResumo),
  }))
  return datasetComVersoesSchema
    .array()
    .parse(resumos)
    .toSorted(maisRecenteAntes)
}

function ultimaImportacao({ versoes }: DatasetComVersoes): string {
  return versoes.reduce(
    (maior, { importadoEm }) => (importadoEm > maior ? importadoEm : maior),
    ""
  )
}

function maisRecenteAntes(a: DatasetComVersoes, b: DatasetComVersoes): number {
  return ultimaImportacao(b).localeCompare(ultimaImportacao(a))
}

async function buscarVersaoDoDataset(
  banco: Banco,
  condicao: ReturnType<typeof and>
): Promise<VersaoDoDataset | null> {
  const [linha] = await banco
    .select({ conjunto: COLUNAS_DO_DATASET, versao: COLUNAS_DA_VERSAO })
    .from(datasetVersao)
    .innerJoin(dataset, eq(dataset.id, datasetVersao.datasetId))
    .where(condicao)
    // Publicada mais recente primeiro; sem publicada, a última importação (só chega aqui quem pode ver privadas).
    .orderBy(
      sql`${datasetVersao.publicadoEm} desc nulls last`,
      desc(datasetVersao.importadoEm)
    )
    .limit(1)
  if (!linha) return null
  return {
    dataset: datasetResumoSchema.parse(linha.conjunto),
    versao: paraVersaoResumo(linha.versao),
  }
}

/**
 * A versão que o papel pode ver (DV-25). Sem `versaoId`: a publicada mais recente; o analista, sem nenhuma publicada,
 * cai na última importação. Com `versaoId`: visitante só enxerga publicada.
 */
export async function obterVersaoVisivel(
  banco: Banco,
  { versaoId, papel }: { versaoId: string | null; papel: Papel }
): Promise<ResultadoVersaoVisivel> {
  const podeVerPrivadas = temPapel(papel, "analista")

  if (versaoId !== null) {
    const encontrada = await buscarVersaoDoDataset(
      banco,
      eq(datasetVersao.id, versaoId)
    )
    if (!encontrada) return { status: "nao-encontrada" }
    if (encontrada.versao.situacao === "privado" && !podeVerPrivadas) {
      return { status: "nao-encontrada" }
    }
    return { status: "ok", ...encontrada }
  }

  const publicada = await buscarVersaoDoDataset(
    banco,
    eq(datasetVersao.situacao, "publicado")
  )
  if (publicada) return { status: "ok", ...publicada }
  if (!podeVerPrivadas) return { status: "nenhum-dataset" }
  const ultima = await buscarVersaoDoDataset(banco, undefined)
  return ultima ? { status: "ok", ...ultima } : { status: "nenhum-dataset" }
}

/**
 * Série agregada da versão (§4.4): `valores` por bairro e período, e o que ficou fora da cobertura por período.
 * Chamar só depois de `obterVersaoVisivel`: a série em si não confere papel.
 */
export async function lerSerieDaVersao(
  banco: Banco,
  versaoId: string
): Promise<SerieSaude> {
  const [versao] = await banco
    .select({ periodos: datasetVersao.periodos })
    .from(datasetVersao)
    .where(eq(datasetVersao.id, versaoId))
  const linhas = await banco
    .select({
      bairroId: datasetLinha.bairroId,
      periodo: datasetLinha.periodo,
      casos: datasetLinha.casos,
    })
    .from(datasetLinha)
    .where(
      and(eq(datasetLinha.versaoId, versaoId), isNotNull(datasetLinha.bairroId))
    )
  const fora = await banco
    .select({
      periodo: datasetLinha.periodo,
      casos: sql<number>`coalesce(sum(${datasetLinha.casos}), 0)::int`,
      localidades: sql<number>`count(${datasetLinha.casos})::int`,
    })
    .from(datasetLinha)
    .where(
      and(eq(datasetLinha.versaoId, versaoId), isNull(datasetLinha.bairroId))
    )
    .groupBy(datasetLinha.periodo)

  const valores: SerieSaude["valores"] = {}
  for (const { bairroId, periodo, casos } of linhas) {
    if (bairroId === null) continue
    valores[bairroId] = { ...valores[bairroId], [periodo]: casos }
  }
  const foraDaCobertura: SerieSaude["foraDaCobertura"] = {}
  for (const { periodo, casos, localidades } of fora) {
    if (localidades > 0) foraDaCobertura[periodo] = { casos, localidades }
  }
  return serieSaudeSchema.parse({
    periodos: versao?.periodos ?? [],
    valores,
    foraDaCobertura,
  })
}

/** Relatório de processamento da versão com a versão e o dataset (RF-02.23); `null` se a versão não existe. */
export async function obterRelatorio(
  banco: Banco,
  versaoId: string
): Promise<RelatorioVersao | null> {
  const [linha] = await banco
    .select({
      conjunto: COLUNAS_DO_DATASET,
      versao: COLUNAS_DA_VERSAO,
      relatorio: datasetVersao.relatorio,
    })
    .from(datasetVersao)
    .innerJoin(dataset, eq(dataset.id, datasetVersao.datasetId))
    .where(eq(datasetVersao.id, versaoId))
  if (!linha) return null
  return {
    dataset: datasetResumoSchema.parse(linha.conjunto),
    versao: paraVersaoResumo(linha.versao),
    relatorio: relatorioImportacaoSchema.parse(linha.relatorio),
  }
}

/**
 * As versões que o papel pode escolher na Saúde (RF-02.28): o visitante só as publicadas; o analista e o
 * administrador também as privadas. Publicadas primeiro, a mais recente à frente; depois as privadas.
 */
export async function listarOpcoesDeVersao(
  banco: Banco,
  papel: Papel
): Promise<OpcaoDeVersao[]> {
  const linhas = await banco
    .select({
      id: datasetVersao.id,
      nome: dataset.nome,
      numero: datasetVersao.numero,
      situacao: datasetVersao.situacao,
    })
    .from(datasetVersao)
    .innerJoin(dataset, eq(dataset.id, datasetVersao.datasetId))
    .where(
      temPapel(papel, "analista")
        ? undefined
        : eq(datasetVersao.situacao, "publicado")
    )
    .orderBy(
      sql`${datasetVersao.situacao} = 'publicado' desc`,
      sql`${datasetVersao.publicadoEm} desc nulls last`,
      desc(datasetVersao.importadoEm)
    )
  return linhas.map(({ id, nome, numero, situacao }) => ({
    id,
    rotulo: `${nome}, versão ${numero}`,
    situacao: situacaoVersaoSchema.parse(situacao),
  }))
}

/** Versões publicadas, para "Fontes e limitações" (RF-02.40): a publicada mais recente primeiro. */
export async function listarDatasetsPublicados(
  banco: Banco
): Promise<DatasetPublicado[]> {
  const linhas = await banco
    .select({ conjunto: COLUNAS_DO_DATASET, versao: COLUNAS_DA_VERSAO })
    .from(datasetVersao)
    .innerJoin(dataset, eq(dataset.id, datasetVersao.datasetId))
    .where(eq(datasetVersao.situacao, "publicado"))
    .orderBy(sql`${datasetVersao.publicadoEm} desc nulls last`)
  return linhas.map(({ conjunto, versao }) => ({
    dataset: datasetResumoSchema.parse(conjunto),
    versao: paraVersaoResumo(versao),
  }))
}
