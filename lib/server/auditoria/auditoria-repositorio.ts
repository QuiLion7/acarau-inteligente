import "server-only"

import {
  and,
  count,
  desc,
  eq,
  gte,
  isNull,
  lt,
  sql,
  type SQL,
} from "drizzle-orm"

import {
  EVENTOS_AUDITORIA,
  ehTipoEventoAuditoria,
  rotuloDaConta,
  type DetalhesAuditoria,
  type TipoAlvoAuditoria,
  type TipoEventoAuditoria,
} from "@/lib/auditoria/eventos-auditoria"
import {
  CONTA_DESCONHECIDA,
  EVENTOS_POR_PAGINA,
  type EventoAuditoria,
  type FiltrosAuditoria,
  type PaginaAuditoria,
} from "@/lib/auditoria/tipos-auditoria"
import type { Executor } from "@/lib/server/db/cliente"
import { datasetVersao, eventoAuditoria, obra } from "@/lib/server/db/schema"

// Brasília não tem horário de verão desde 2019: o dia do filtro é um intervalo fixo de UTC-3.
const DESLOCAMENTO_BRASILIA = "-03:00"
const MS_POR_DIA = 24 * 60 * 60 * 1000

export type EventoParaGravar = {
  ocorridoEm: Date
  tipo: TipoEventoAuditoria
  conta: string | null
  alvo: { tipo: TipoAlvoAuditoria; id: string } | null
  detalhes: DetalhesAuditoria
  requestId: string | null
}

/** Só insere: a auditoria não tem atualização nem exclusão (RN-05.07). */
export async function inserirEvento(
  executor: Executor,
  evento: EventoParaGravar
): Promise<void> {
  await executor.insert(eventoAuditoria).values({
    ocorridoEm: evento.ocorridoEm,
    tipo: evento.tipo,
    conta: evento.conta,
    resultado: EVENTOS_AUDITORIA[evento.tipo].resultado,
    alvoTipo: evento.alvo?.tipo ?? null,
    alvoId: evento.alvo?.id ?? null,
    detalhes: evento.detalhes,
    requestId: evento.requestId,
  })
}

function inicioDoDia(dia: string): Date {
  return new Date(`${dia}T00:00:00.000${DESLOCAMENTO_BRASILIA}`)
}

function condicoes(filtros: FiltrosAuditoria): SQL | undefined {
  const lista: SQL[] = []
  if (filtros.tipo) lista.push(eq(eventoAuditoria.tipo, filtros.tipo))
  if (filtros.conta === CONTA_DESCONHECIDA) {
    lista.push(isNull(eventoAuditoria.conta))
  } else if (filtros.conta) {
    lista.push(eq(eventoAuditoria.conta, filtros.conta))
  }
  if (filtros.de)
    lista.push(gte(eventoAuditoria.ocorridoEm, inicioDoDia(filtros.de)))
  if (filtros.ate) {
    const fim = new Date(inicioDoDia(filtros.ate).getTime() + MS_POR_DIA)
    lista.push(lt(eventoAuditoria.ocorridoEm, fim))
  }
  return lista.length > 0 ? and(...lista) : undefined
}

type ContaParaRotulo = { usuario: string; nome: string }

/**
 * Página da auditoria, do mais recente ao mais antigo (RF-05.26). A existência do alvo vem de um `left join`
 * (`alvo_id` não tem FK: o reset apaga o alvo e o evento continua, DEC-T-10). Página além da última devolve vazio.
 */
export async function listarEventos(
  leitor: Executor,
  filtros: FiltrosAuditoria,
  contas: readonly ContaParaRotulo[] = []
): Promise<PaginaAuditoria> {
  const where = condicoes(filtros)
  const nomePorConta = Object.fromEntries(
    contas.map(({ usuario, nome }) => [usuario, nome])
  )
  const [totais, linhas] = await Promise.all([
    leitor.select({ total: count() }).from(eventoAuditoria).where(where),
    leitor
      .select({
        id: eventoAuditoria.id,
        ocorridoEm: eventoAuditoria.ocorridoEm,
        tipo: eventoAuditoria.tipo,
        conta: eventoAuditoria.conta,
        resultado: eventoAuditoria.resultado,
        alvoTipo: eventoAuditoria.alvoTipo,
        alvoId: eventoAuditoria.alvoId,
        detalhes: eventoAuditoria.detalhes,
        versaoExiste: sql<boolean>`${datasetVersao.id} is not null`,
        obraExiste: sql<boolean>`${obra.id} is not null`,
      })
      .from(eventoAuditoria)
      .leftJoin(
        datasetVersao,
        and(
          eq(eventoAuditoria.alvoTipo, "dataset_versao"),
          eq(eventoAuditoria.alvoId, datasetVersao.id)
        )
      )
      .leftJoin(
        obra,
        and(
          eq(eventoAuditoria.alvoTipo, "obra"),
          eq(eventoAuditoria.alvoId, obra.id)
        )
      )
      .where(where)
      .orderBy(desc(eventoAuditoria.ocorridoEm), desc(eventoAuditoria.id))
      .limit(EVENTOS_POR_PAGINA)
      .offset((filtros.pagina - 1) * EVENTOS_POR_PAGINA),
  ])
  const total = totais[0]?.total ?? 0
  const eventos = linhas.flatMap<EventoAuditoria>((linha) => {
    // O `check` do banco já limita o tipo; o guard protege contra linha gravada por fora.
    if (!ehTipoEventoAuditoria(linha.tipo)) return []
    const alvoTipo: TipoAlvoAuditoria =
      linha.alvoTipo === "obra" ? "obra" : "dataset_versao"
    return [
      {
        id: String(linha.id),
        ocorridoEm: linha.ocorridoEm.toISOString(),
        tipo: linha.tipo,
        rotulo: EVENTOS_AUDITORIA[linha.tipo].rotulo,
        conta: linha.conta,
        contaRotulo: rotuloDaConta(linha.conta, linha.tipo, nomePorConta),
        resultado: EVENTOS_AUDITORIA[linha.tipo].resultado,
        alvo:
          linha.alvoId === null
            ? null
            : {
                tipo: alvoTipo,
                id: linha.alvoId,
                existe:
                  alvoTipo === "obra" ? linha.obraExiste : linha.versaoExiste,
              },
        detalhes: linha.detalhes,
      },
    ]
  })
  return {
    eventos,
    total,
    paginas: Math.max(1, Math.ceil(total / EVENTOS_POR_PAGINA)),
    pagina: filtros.pagina,
  }
}
