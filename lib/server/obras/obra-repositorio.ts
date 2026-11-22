import "server-only"

import { count, desc, eq, inArray, max } from "drizzle-orm"

import type { Executor } from "@/lib/server/db/cliente"
import {
  obra,
  obraHistorico,
  type ObraHistoricoLinha,
  type ObraLinha,
} from "@/lib/server/db/schema"
import { obraSchema, type Obra } from "@/lib/validations/obra-schema"

// Leitura das obras para o Server Component e para o PDF do EP-05 (DV-42): obras com o histórico embutido, sem
// `GET` e sem N+1 (DEC-T-03). `criado_por`/`atualizado_por` ficam de fora: auditoria não vai ao cliente.

function montarLocalizacao({ longitude, latitude }: ObraLinha) {
  return longitude === null || latitude === null
    ? null
    : { longitude, latitude }
}

function montarObra(linha: ObraLinha, historico: ObraHistoricoLinha[]): Obra {
  // Zod na fronteira do banco: valor fora do contrato (um `check` mudado à mão, por exemplo) falha aqui, não na tela.
  return obraSchema.parse({
    id: linha.id,
    titulo: linha.titulo,
    situacao: linha.situacao,
    descricao: linha.descricao,
    categoria: linha.categoria,
    secretaria: linha.secretaria,
    dataInicio: linha.dataInicio,
    dataPrevista: linha.dataPrevista,
    valorPrevistoCentavos: linha.valorPrevistoCentavos,
    localizacao: montarLocalizacao(linha),
    estadoLocalizacao: linha.estadoLocalizacao,
    bairroId: linha.bairroId,
    proveniencia: linha.proveniencia,
    atualizadoEm: linha.atualizadoEm.toISOString(),
    historico: historico.map((entrada) => ({
      situacaoAnterior: entrada.situacaoAnterior,
      situacaoNova: entrada.situacaoNova,
      autorNome: entrada.autorNome,
      registradoEm: entrada.registradoEm.toISOString(),
    })),
  })
}

async function lerHistoricos(
  leitor: Executor,
  linhas: ObraLinha[]
): Promise<Map<string, ObraHistoricoLinha[]>> {
  const porObra = new Map<string, ObraHistoricoLinha[]>()
  if (linhas.length === 0) return porObra
  const entradas = await leitor
    .select()
    .from(obraHistorico)
    .where(
      inArray(
        obraHistorico.obraId,
        linhas.map(({ id }) => id)
      )
    )
    .orderBy(desc(obraHistorico.registradoEm))
  for (const entrada of entradas) {
    porObra.set(entrada.obraId, [
      ...(porObra.get(entrada.obraId) ?? []),
      entrada,
    ])
  }
  return porObra
}

/** Todas as obras da última atualização para a mais antiga, cada uma com o histórico da entrada mais recente para a mais antiga. Duas consultas. */
export async function listarObras(leitor: Executor): Promise<Obra[]> {
  const linhas = await leitor
    .select()
    .from(obra)
    .orderBy(desc(obra.atualizadoEm))
  const historicos = await lerHistoricos(leitor, linhas)
  return linhas.map((linha) =>
    montarObra(linha, historicos.get(linha.id) ?? [])
  )
}

/** Uma obra pelo id, na forma do contrato; `null` se não existe. */
export async function obterObra(
  leitor: Executor,
  id: string
): Promise<Obra | null> {
  const [linha] = await leitor.select().from(obra).where(eq(obra.id, id))
  if (!linha) return null
  const historicos = await lerHistoricos(leitor, [linha])
  return montarObra(linha, historicos.get(linha.id) ?? [])
}

export type ResumoParaFontes = {
  quantidade: number
  /** ISO 8601 UTC; `null` quando não há obra (nunca vira data inventada). */
  ultimaAtualizacao: string | null
}

/** O que "Fontes e limitações" mostra das obras (RF-04.34): quantas são e quando mudou a última. */
export async function resumirObrasParaFontes(
  leitor: Executor
): Promise<ResumoParaFontes> {
  const [resumo] = await leitor
    .select({ quantidade: count(), ultima: max(obra.atualizadoEm) })
    .from(obra)
  return {
    quantidade: resumo?.quantidade ?? 0,
    ultimaAtualizacao: resumo?.ultima?.toISOString() ?? null,
  }
}
