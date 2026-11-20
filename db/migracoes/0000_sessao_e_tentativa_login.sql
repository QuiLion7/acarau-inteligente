CREATE TABLE "sessao" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"usuario" text NOT NULL,
	"impressao_credencial" text NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ultima_atividade_em" timestamp with time zone DEFAULT now() NOT NULL,
	"encerrada_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tentativa_login" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"usuario" text NOT NULL,
	"sucesso" boolean NOT NULL,
	"ocorrida_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "sessao_usuario_idx" ON "sessao" USING btree ("usuario");--> statement-breakpoint
CREATE INDEX "tentativa_login_usuario_ocorrida_em_idx" ON "tentativa_login" USING btree ("usuario","ocorrida_em" DESC NULLS LAST);