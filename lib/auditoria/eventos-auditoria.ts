// Catálogo da auditoria (TechSpec EP-05 §2, §4.4, DV-48): todo tipo de evento declara rótulo, resultado, o evento de log
// que já existia (nome e nível) e os campos de `detalhes` que podem ser gravados. Evento novo entra aqui e no `check`
// de `evento_auditoria` (migração nova). Módulo puro: serve ao servidor (gravação) e à tela (rótulos, filtros).

export const TIPOS_EVENTO_AUDITORIA = [
  "login_sucesso",
  "login_falha",
  "login_bloqueado",
  "logout",
  "acesso_negado",
  "importacao_confirmada",
  "importacao_recusada",
  "importacao_duplicada",
  "versao_publicada",
  "versao_despublicada",
  "obra_criada",
  "obra_editada",
  "obra_recusada",
  "demo_reiniciada",
] as const

export type TipoEventoAuditoria = (typeof TIPOS_EVENTO_AUDITORIA)[number]

export const RESULTADOS_AUDITORIA = ["sucesso", "recusado"] as const
export type ResultadoAuditoria = (typeof RESULTADOS_AUDITORIA)[number]

export const TIPOS_ALVO_AUDITORIA = ["dataset_versao", "obra"] as const
export type TipoAlvoAuditoria = (typeof TIPOS_ALVO_AUDITORIA)[number]

export type NivelLogAuditoria = "info" | "warn"

type DefinicaoEvento = {
  rotulo: string
  resultado: ResultadoAuditoria
  /** Nome e nível do evento que o log já emitia (PA-05.03): continua igual. */
  eventoLog: string
  nivelLog: NivelLogAuditoria
  /** Únicos campos de `detalhes` que o tipo aceita; nunca texto livre, nome de arquivo, senha ou hash (RF-05.25). */
  detalhes: readonly string[]
}

export const EVENTOS_AUDITORIA: Readonly<
  Record<TipoEventoAuditoria, DefinicaoEvento>
> = {
  login_sucesso: {
    rotulo: "Entrada com sucesso",
    resultado: "sucesso",
    eventoLog: "auth.login_sucesso",
    nivelLog: "info",
    detalhes: [],
  },
  login_falha: {
    rotulo: "Falha de login",
    resultado: "recusado",
    eventoLog: "auth.login_falha",
    nivelLog: "warn",
    detalhes: [],
  },
  login_bloqueado: {
    rotulo: "Login bloqueado",
    resultado: "recusado",
    eventoLog: "auth.login_bloqueado",
    nivelLog: "warn",
    detalhes: [],
  },
  logout: {
    rotulo: "Saída",
    resultado: "sucesso",
    eventoLog: "auth.logout",
    nivelLog: "info",
    detalhes: [],
  },
  acesso_negado: {
    rotulo: "Acesso negado",
    resultado: "recusado",
    eventoLog: "auth.acesso_negado",
    nivelLog: "warn",
    detalhes: ["rota", "motivo"],
  },
  importacao_confirmada: {
    rotulo: "Importação confirmada",
    resultado: "sucesso",
    eventoLog: "importacao.confirmada",
    nivelLog: "info",
    detalhes: ["numero", "linhas"],
  },
  importacao_recusada: {
    rotulo: "Importação recusada",
    resultado: "recusado",
    eventoLog: "importacao.recusada",
    nivelLog: "warn",
    detalhes: ["codigo"],
  },
  importacao_duplicada: {
    rotulo: "Importação duplicada",
    resultado: "recusado",
    eventoLog: "importacao.duplicada",
    nivelLog: "info",
    detalhes: [],
  },
  versao_publicada: {
    rotulo: "Versão publicada",
    resultado: "sucesso",
    eventoLog: "dataset.publicado",
    nivelLog: "info",
    detalhes: [],
  },
  versao_despublicada: {
    rotulo: "Versão despublicada",
    resultado: "sucesso",
    eventoLog: "dataset.despublicado",
    nivelLog: "info",
    detalhes: [],
  },
  obra_criada: {
    rotulo: "Obra criada",
    resultado: "sucesso",
    eventoLog: "obra.criada",
    nivelLog: "info",
    detalhes: [],
  },
  obra_editada: {
    rotulo: "Obra editada",
    resultado: "sucesso",
    eventoLog: "obra.editada",
    nivelLog: "info",
    detalhes: ["situacaoAlterada"],
  },
  obra_recusada: {
    rotulo: "Obra recusada",
    resultado: "recusado",
    eventoLog: "obra.recusada",
    nivelLog: "warn",
    detalhes: ["motivo"],
  },
  demo_reiniciada: {
    rotulo: "Demo reiniciada",
    resultado: "sucesso",
    eventoLog: "demo.reset",
    nivelLog: "info",
    detalhes: ["datasetsRemovidos", "obrasRemovidas"],
  },
}

export type DetalheAuditoria = string | number | boolean
export type DetalhesAuditoria = Record<string, DetalheAuditoria>

const TAMANHO_MAXIMO_TEXTO = 200

export const ROTULO_CONTA_DESCONHECIDA = "Conta desconhecida"
export const ROTULO_SEM_SESSAO = "Sem sessão"

export function ehTipoEventoAuditoria(
  valor: unknown
): valor is TipoEventoAuditoria {
  return TIPOS_EVENTO_AUDITORIA.some((tipo) => tipo === valor)
}

/**
 * Filtra `detalhes` pelo catálogo: só campos permitidos para o tipo, só valores simples (texto curto, número,
 * booleano). Qualquer outro campo é descartado, para a auditoria nunca guardar texto livre nem dado sensível.
 */
export function filtrarDetalhes(
  tipo: TipoEventoAuditoria,
  detalhes: Readonly<Record<string, unknown>> | undefined
): DetalhesAuditoria {
  const permitidos = EVENTOS_AUDITORIA[tipo].detalhes
  const resultado: DetalhesAuditoria = {}
  for (const campo of permitidos) {
    const valor = detalhes?.[campo]
    if (typeof valor === "string") {
      resultado[campo] = valor.slice(0, TAMANHO_MAXIMO_TEXTO)
    } else if (typeof valor === "number" && Number.isFinite(valor)) {
      resultado[campo] = valor
    } else if (typeof valor === "boolean") {
      resultado[campo] = valor
    }
  }
  return resultado
}

/** Texto da conta na tela: conta demo, "Conta desconhecida" (login com usuário que não é conta) ou "Sem sessão". */
export function rotuloDaConta(
  conta: string | null,
  tipo: TipoEventoAuditoria,
  nomePorConta: Readonly<Record<string, string>>
): string {
  if (conta !== null) return nomePorConta[conta] ?? conta
  return tipo === "acesso_negado"
    ? ROTULO_SEM_SESSAO
    : ROTULO_CONTA_DESCONHECIDA
}
