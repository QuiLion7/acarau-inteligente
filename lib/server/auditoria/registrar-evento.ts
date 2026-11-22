import "server-only"

import {
  EVENTOS_AUDITORIA,
  filtrarDetalhes,
  type TipoAlvoAuditoria,
  type TipoEventoAuditoria,
} from "@/lib/auditoria/eventos-auditoria"
import { obterBanco, type Executor } from "@/lib/server/db/cliente"
import { inserirEvento } from "@/lib/server/auditoria/auditoria-repositorio"
import { log, type CamposLog } from "@/lib/server/log"

export type EventoAuditoriaNovo = {
  tipo: TipoEventoAuditoria
  requestId?: string
  /** Usuário normalizado de uma conta demo; `null` = conta desconhecida ou sem sessão. */
  conta: string | null
  alvo?: { tipo: TipoAlvoAuditoria; id: string } | null
  /** Passa pelo catálogo: só os campos permitidos para o tipo são gravados. */
  detalhes?: Record<string, unknown>
  /** Exatamente os campos que o log já emitia para este evento (PA-05.03); o nome e o nível vêm do catálogo. */
  camposLog: CamposLog
}

export type DependenciasRegistro = { banco?: Executor; agora?: Date }

/**
 * Registra o evento no log (como antes) e o grava em `evento_auditoria` (RF-05.24). Chamar **depois** do commit da
 * operação. Nunca lança: falha na gravação vai só para o log e a operação do usuário segue (RF-05.30, DEC-T-09).
 */
export async function registrarEvento(
  evento: EventoAuditoriaNovo,
  { banco, agora = new Date() }: DependenciasRegistro = {}
): Promise<void> {
  const definicao = EVENTOS_AUDITORIA[evento.tipo]
  log[definicao.nivelLog](definicao.eventoLog, evento.camposLog)
  try {
    await inserirEvento(banco ?? obterBanco(), {
      ocorridoEm: agora,
      tipo: evento.tipo,
      conta: evento.conta,
      alvo: evento.alvo ?? null,
      detalhes: filtrarDetalhes(evento.tipo, evento.detalhes),
      requestId: evento.requestId ?? null,
    })
  } catch (erro) {
    log.error("auditoria.falha_gravacao", {
      tipo: evento.tipo,
      requestId: evento.requestId,
      erro,
    })
  }
}
