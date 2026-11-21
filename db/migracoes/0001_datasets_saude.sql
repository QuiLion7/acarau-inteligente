CREATE TABLE "dataset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"indicador" text NOT NULL,
	"fonte" text NOT NULL,
	"unidade" text DEFAULT 'casos' NOT NULL,
	"proveniencia" text NOT NULL,
	"pre_carregado" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dataset_proveniencia_sintetico" CHECK ("dataset"."proveniencia" = 'SINTETICO')
);
--> statement-breakpoint
CREATE TABLE "dataset_linha" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"versao_id" uuid NOT NULL,
	"linha_arquivo" integer NOT NULL,
	"bairro_id" text,
	"nome_original" text NOT NULL,
	"periodo" text NOT NULL,
	"casos" integer,
	CONSTRAINT "dataset_linha_casos_nao_negativo" CHECK ("dataset_linha"."casos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "dataset_versao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dataset_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"situacao" text NOT NULL,
	"granularidade" text NOT NULL,
	"periodos" text[] NOT NULL,
	"hash_conteudo" text NOT NULL,
	"nome_arquivo" text NOT NULL,
	"autor_usuario" text NOT NULL,
	"autor_nome" text NOT NULL,
	"linhas_gravadas" integer NOT NULL,
	"importado_em" timestamp with time zone NOT NULL,
	"publicado_em" timestamp with time zone,
	"relatorio" jsonb NOT NULL,
	CONSTRAINT "dataset_versao_numero_unico" UNIQUE("dataset_id","numero"),
	CONSTRAINT "dataset_versao_hash_conteudo_unico" UNIQUE("hash_conteudo"),
	CONSTRAINT "dataset_versao_situacao_valida" CHECK ("dataset_versao"."situacao" in ('privado', 'publicado')),
	CONSTRAINT "dataset_versao_granularidade_valida" CHECK ("dataset_versao"."granularidade" in ('ano', 'mes'))
);
--> statement-breakpoint
ALTER TABLE "dataset_linha" ADD CONSTRAINT "dataset_linha_versao_id_dataset_versao_id_fk" FOREIGN KEY ("versao_id") REFERENCES "public"."dataset_versao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dataset_versao" ADD CONSTRAINT "dataset_versao_dataset_id_dataset_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."dataset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dataset_pre_carregado_unico" ON "dataset" USING btree ("pre_carregado") WHERE "dataset"."pre_carregado";--> statement-breakpoint
CREATE INDEX "dataset_linha_versao_idx" ON "dataset_linha" USING btree ("versao_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dataset_linha_bairro_periodo_unico" ON "dataset_linha" USING btree ("versao_id","bairro_id","periodo") WHERE "dataset_linha"."bairro_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "dataset_versao_uma_publicada" ON "dataset_versao" USING btree ("dataset_id") WHERE "dataset_versao"."situacao" = 'publicado';