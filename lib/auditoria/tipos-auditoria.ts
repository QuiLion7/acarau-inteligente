import type {
  DetalhesAuditoria,
  ResultadoAuditoria,
  TipoAlvoAuditoria,
  TipoEventoAuditoria,
} from "@/lib/auditoria/eventos-auditoria"

// Contratos internos da consulta da auditoria (TechSpec EP-05 §4.4): sem endpoint, a página lê pelo repositório.

export const CONTA_DESCONHECIDA = "desconhecida"
export const EVENTOS_POR_PAGINA = 25

export type FiltrosAuditoria = {
  tipo: TipoEventoAuditoria | null
  /** Usuário de conta do ambiente, `"desconhecida"` (sem conta) ou `null` (todas). */
  conta: string | null
  /** `aaaa-mm-dd`, dia inteiro no fuso de Brasília; `ate` é inclusivo. */
  de: string | null
  ate: string | null
  pagina: number
}

export type EventoAuditoria = {
  id: string
  ocorridoEm: string
  tipo: TipoEventoAuditoria
  rotulo: string
  conta: string | null
  contaRotulo: string
  resultado: ResultadoAuditoria
  alvo: { tipo: TipoAlvoAuditoria; id: string; existe: boolean } | null
  detalhes: DetalhesAuditoria
}

export type PaginaAuditoria = {
  eventos: EventoAuditoria[]
  total: number
  paginas: number
  pagina: number
}
