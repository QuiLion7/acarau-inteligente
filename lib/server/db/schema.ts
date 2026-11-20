import {
  bigserial,
  boolean,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

const instante = (nome: string) => timestamp(nome, { withTimezone: true })

// Sessão autenticada (TechSpec §4.1). O token em claro nunca é gravado; o papel
// também não: vem da conta no ambiente a cada validação.
export const sessao = pgTable(
  "sessao",
  {
    tokenHash: text("token_hash").primaryKey(),
    usuario: text("usuario").notNull(),
    impressaoCredencial: text("impressao_credencial").notNull(),
    criadaEm: instante("criada_em").notNull().defaultNow(),
    ultimaAtividadeEm: instante("ultima_atividade_em").notNull().defaultNow(),
    encerradaEm: instante("encerrada_em"),
  },
  (tabela) => [index("sessao_usuario_idx").on(tabela.usuario)]
)

// Tentativas de login para o bloqueio por usuário (TechSpec §4.2). Sem IP nem
// user-agent: o bloqueio vale por nome, mesmo para conta que não existe.
export const tentativaLogin = pgTable(
  "tentativa_login",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    usuario: text("usuario").notNull(),
    sucesso: boolean("sucesso").notNull(),
    ocorridaEm: instante("ocorrida_em").notNull().defaultNow(),
  },
  (tabela) => [
    index("tentativa_login_usuario_ocorrida_em_idx").on(
      tabela.usuario,
      tabela.ocorridaEm.desc()
    ),
  ]
)

export type Sessao = typeof sessao.$inferSelect
export type NovaSessao = typeof sessao.$inferInsert
export type TentativaLogin = typeof tentativaLogin.$inferSelect
export type NovaTentativaLogin = typeof tentativaLogin.$inferInsert
