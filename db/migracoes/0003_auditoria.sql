CREATE TABLE "evento_auditoria" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ocorrido_em" timestamp with time zone NOT NULL,
	"tipo" text NOT NULL,
	"conta" text,
	"resultado" text NOT NULL,
	"alvo_tipo" text,
	"alvo_id" uuid,
	"detalhes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_id" uuid,
	CONSTRAINT "evento_auditoria_tipo_valido" CHECK ("evento_auditoria"."tipo" in ('login_sucesso', 'login_falha', 'login_bloqueado', 'logout', 'acesso_negado', 'importacao_confirmada', 'importacao_recusada', 'importacao_duplicada', 'versao_publicada', 'versao_despublicada', 'obra_criada', 'obra_editada', 'obra_recusada', 'demo_reiniciada')),
	CONSTRAINT "evento_auditoria_resultado_valido" CHECK ("evento_auditoria"."resultado" in ('sucesso', 'recusado')),
	CONSTRAINT "evento_auditoria_alvo_valido" CHECK ("evento_auditoria"."alvo_tipo" is null or "evento_auditoria"."alvo_tipo" in ('dataset_versao', 'obra')),
	CONSTRAINT "evento_auditoria_alvo_completo" CHECK (("evento_auditoria"."alvo_tipo" is null) = ("evento_auditoria"."alvo_id" is null))
);
--> statement-breakpoint
CREATE INDEX "evento_auditoria_ocorrido_em_idx" ON "evento_auditoria" USING btree ("ocorrido_em" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "evento_auditoria_tipo_ocorrido_em_idx" ON "evento_auditoria" USING btree ("tipo","ocorrido_em" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "evento_auditoria_conta_ocorrido_em_idx" ON "evento_auditoria" USING btree ("conta","ocorrido_em" DESC NULLS LAST);