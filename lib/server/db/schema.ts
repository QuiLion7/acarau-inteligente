import { sql } from "drizzle-orm"
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import {
  CATEGORIAS_OBRA,
  ESTADOS_LOCALIZACAO_OBRA,
  SITUACOES_OBRA,
} from "@/lib/obras/situacao-obra"

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

// Datasets de saúde importados (TechSpec EP-02 §4.6, DV-24). Só dado sintético: o `check` é a última defesa de RN-02.02.
export const dataset = pgTable(
  "dataset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    indicador: text("indicador").notNull(),
    fonte: text("fonte").notNull(),
    unidade: text("unidade").notNull().default("casos"),
    proveniencia: text("proveniencia").notNull(),
    preCarregado: boolean("pre_carregado").notNull().default(false),
    criadoEm: instante("criado_em").notNull().defaultNow(),
  },
  (tabela) => [
    check(
      "dataset_proveniencia_sintetico",
      sql`${tabela.proveniencia} = 'SINTETICO'`
    ),
    // No máximo um dataset pré-carregado (RF-02.41): a carga da demo é idempotente por este índice.
    uniqueIndex("dataset_pre_carregado_unico")
      .on(tabela.preCarregado)
      .where(sql`${tabela.preCarregado}`),
  ]
)

// Uma importação confirmada. O `hash_conteudo` único é a idempotência (DEC-T-02): o mesmo conteúdo nunca é gravado
// duas vezes, com outro nome ou na confirmação dupla. Só uma versão publicada por dataset (RF-02.24).
export const datasetVersao = pgTable(
  "dataset_versao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => dataset.id, { onDelete: "cascade" }),
    numero: integer("numero").notNull(),
    situacao: text("situacao").notNull(),
    granularidade: text("granularidade").notNull(),
    periodos: text("periodos").array().notNull(),
    hashConteudo: text("hash_conteudo").notNull(),
    nomeArquivo: text("nome_arquivo").notNull(),
    autorUsuario: text("autor_usuario").notNull(),
    autorNome: text("autor_nome").notNull(),
    linhasGravadas: integer("linhas_gravadas").notNull(),
    importadoEm: instante("importado_em").notNull(),
    publicadoEm: instante("publicado_em"),
    // `RelatorioImportacao`: validado por Zod na leitura (lib/importacao/relatorio-schema.ts), nunca consultado por campo.
    relatorio: jsonb("relatorio").notNull(),
  },
  (tabela) => [
    unique("dataset_versao_numero_unico").on(tabela.datasetId, tabela.numero),
    unique("dataset_versao_hash_conteudo_unico").on(tabela.hashConteudo),
    check(
      "dataset_versao_situacao_valida",
      sql`${tabela.situacao} in ('privado', 'publicado')`
    ),
    check(
      "dataset_versao_granularidade_valida",
      sql`${tabela.granularidade} in ('ano', 'mes')`
    ),
    uniqueIndex("dataset_versao_uma_publicada")
      .on(tabela.datasetId)
      .where(sql`${tabela.situacao} = 'publicado'`),
  ]
)

// Linha normalizada. `bairro_id` nulo = fora da cobertura (nome original guardado como veio, PR-10); `casos` nulo =
// sem dado, nunca zero (RN-014).
export const datasetLinha = pgTable(
  "dataset_linha",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    versaoId: uuid("versao_id")
      .notNull()
      .references(() => datasetVersao.id, { onDelete: "cascade" }),
    linhaArquivo: integer("linha_arquivo").notNull(),
    bairroId: text("bairro_id"),
    nomeOriginal: text("nome_original").notNull(),
    periodo: text("periodo").notNull(),
    casos: integer("casos"),
  },
  (tabela) => [
    index("dataset_linha_versao_idx").on(tabela.versaoId),
    check("dataset_linha_casos_nao_negativo", sql`${tabela.casos} >= 0`),
    // Última defesa contra a duplicata depois da correspondência (RN-02.06); o motor já a recusa antes.
    uniqueIndex("dataset_linha_bairro_periodo_unico")
      .on(tabela.versaoId, tabela.bairroId, tabela.periodo)
      .where(sql`${tabela.bairroId} is not null`),
  ]
)

// Valores dos catálogos como lista para o `in (...)` do `check`: vêm de constantes do código, nunca de entrada.
const listaSql = (valores: readonly string[]) =>
  sql.raw(valores.map((valor) => `'${valor}'`).join(", "))

// Obras da demo (TechSpec EP-04 §4.5, DV-42, DV-43). Só dado sintético, como o `dataset`. O bairro é gravado na
// escrita (DEC-T-09). `criado_por`/`atualizado_por` guardam o usuário da conta e não vão ao cliente.
export const obra = pgTable(
  "obra",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    titulo: text("titulo").notNull(),
    descricao: text("descricao"),
    categoria: text("categoria"),
    secretaria: text("secretaria"),
    situacao: text("situacao").notNull(),
    dataInicio: date("data_inicio", { mode: "string" }),
    dataPrevista: date("data_prevista", { mode: "string" }),
    // Centavos: sem ponto flutuante em dinheiro (DEC-T-07).
    valorPrevistoCentavos: bigint("valor_previsto_centavos", {
      mode: "number",
    }),
    longitude: doublePrecision("longitude"),
    latitude: doublePrecision("latitude"),
    estadoLocalizacao: text("estado_localizacao").notNull(),
    bairroId: text("bairro_id"),
    proveniencia: text("proveniencia").notNull().default("SINTETICO"),
    // Só nas obras de exemplo (`DEMO-01`): a carga idempotente usa `on conflict` nesta coluna (DEC-T-08).
    codigoExemplo: text("codigo_exemplo"),
    criadoPor: text("criado_por").notNull(),
    criadoEm: instante("criado_em").notNull().defaultNow(),
    atualizadoPor: text("atualizado_por").notNull(),
    atualizadoEm: instante("atualizado_em").notNull().defaultNow(),
  },
  (tabela) => [
    unique("obra_codigo_exemplo_unico").on(tabela.codigoExemplo),
    index("obra_atualizado_em_idx").on(tabela.atualizadoEm),
    check(
      "obra_situacao_valida",
      sql`${tabela.situacao} in (${listaSql(SITUACOES_OBRA)})`
    ),
    check(
      "obra_categoria_valida",
      sql`${tabela.categoria} is null or ${tabela.categoria} in (${listaSql(CATEGORIAS_OBRA)})`
    ),
    check("obra_valor_nao_negativo", sql`${tabela.valorPrevistoCentavos} >= 0`),
    check(
      "obra_coordenadas_juntas",
      sql`(${tabela.longitude} is null) = (${tabela.latitude} is null)`
    ),
    check(
      "obra_estado_localizacao_valido",
      sql`${tabela.estadoLocalizacao} in (${listaSql(ESTADOS_LOCALIZACAO_OBRA)})`
    ),
    check(
      "obra_sem_localizacao_coerente",
      sql`(${tabela.estadoLocalizacao} = 'sem-localizacao') = (${tabela.longitude} is null)`
    ),
    check(
      "obra_bairro_coerente",
      sql`(${tabela.bairroId} is not null) = (${tabela.estadoLocalizacao} = 'dentro-de-bairro')`
    ),
    check(
      "obra_proveniencia_sintetico",
      sql`${tabela.proveniencia} = 'SINTETICO'`
    ),
    check(
      "obra_datas_coerentes",
      sql`${tabela.dataInicio} is null or ${tabela.dataPrevista} is null or ${tabela.dataPrevista} >= ${tabela.dataInicio}`
    ),
  ]
)

// Histórico de situação (RN-04.10): só se insere. Nenhum código faz `update`/`delete` aqui; o único caminho de
// remoção é o cascade do reset (RF-04.28).
export const obraHistorico = pgTable(
  "obra_historico",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    obraId: uuid("obra_id")
      .notNull()
      .references(() => obra.id, { onDelete: "cascade" }),
    situacaoAnterior: text("situacao_anterior"),
    situacaoNova: text("situacao_nova").notNull(),
    autorNome: text("autor_nome").notNull(),
    registradoEm: instante("registrado_em").notNull().defaultNow(),
  },
  (tabela) => [
    index("obra_historico_obra_registrado_em_idx").on(
      tabela.obraId,
      tabela.registradoEm
    ),
    check(
      "obra_historico_situacao_anterior_valida",
      sql`${tabela.situacaoAnterior} is null or ${tabela.situacaoAnterior} in (${listaSql(SITUACOES_OBRA)})`
    ),
    check(
      "obra_historico_situacao_nova_valida",
      sql`${tabela.situacaoNova} in (${listaSql(SITUACOES_OBRA)})`
    ),
  ]
)

export type Sessao = typeof sessao.$inferSelect
export type NovaSessao = typeof sessao.$inferInsert
export type TentativaLogin = typeof tentativaLogin.$inferSelect
export type NovaTentativaLogin = typeof tentativaLogin.$inferInsert
export type Dataset = typeof dataset.$inferSelect
export type NovoDataset = typeof dataset.$inferInsert
export type DatasetVersao = typeof datasetVersao.$inferSelect
export type NovaDatasetVersao = typeof datasetVersao.$inferInsert
export type DatasetLinha = typeof datasetLinha.$inferSelect
export type NovaDatasetLinha = typeof datasetLinha.$inferInsert
export type ObraLinha = typeof obra.$inferSelect
export type NovaObraLinha = typeof obra.$inferInsert
export type ObraHistoricoLinha = typeof obraHistorico.$inferSelect
export type NovaObraHistoricoLinha = typeof obraHistorico.$inferInsert
