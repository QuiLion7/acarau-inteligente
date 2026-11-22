CREATE TABLE "obra" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"categoria" text,
	"secretaria" text,
	"situacao" text NOT NULL,
	"data_inicio" date,
	"data_prevista" date,
	"valor_previsto_centavos" bigint,
	"longitude" double precision,
	"latitude" double precision,
	"estado_localizacao" text NOT NULL,
	"bairro_id" text,
	"proveniencia" text DEFAULT 'SINTETICO' NOT NULL,
	"codigo_exemplo" text,
	"criado_por" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_por" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "obra_codigo_exemplo_unico" UNIQUE("codigo_exemplo"),
	CONSTRAINT "obra_situacao_valida" CHECK ("obra"."situacao" in ('planejada', 'em_andamento', 'concluida', 'suspensa')),
	CONSTRAINT "obra_categoria_valida" CHECK ("obra"."categoria" is null or "obra"."categoria" in ('pavimentacao', 'saneamento', 'drenagem', 'edificacao_publica', 'praca_lazer', 'iluminacao', 'outra')),
	CONSTRAINT "obra_valor_nao_negativo" CHECK ("obra"."valor_previsto_centavos" >= 0),
	CONSTRAINT "obra_coordenadas_juntas" CHECK (("obra"."longitude" is null) = ("obra"."latitude" is null)),
	CONSTRAINT "obra_estado_localizacao_valido" CHECK ("obra"."estado_localizacao" in ('dentro-de-bairro', 'fora-da-cobertura', 'sem-localizacao')),
	CONSTRAINT "obra_sem_localizacao_coerente" CHECK (("obra"."estado_localizacao" = 'sem-localizacao') = ("obra"."longitude" is null)),
	CONSTRAINT "obra_bairro_coerente" CHECK (("obra"."bairro_id" is not null) = ("obra"."estado_localizacao" = 'dentro-de-bairro')),
	CONSTRAINT "obra_proveniencia_sintetico" CHECK ("obra"."proveniencia" = 'SINTETICO'),
	CONSTRAINT "obra_datas_coerentes" CHECK ("obra"."data_inicio" is null or "obra"."data_prevista" is null or "obra"."data_prevista" >= "obra"."data_inicio")
);
--> statement-breakpoint
CREATE TABLE "obra_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"obra_id" uuid NOT NULL,
	"situacao_anterior" text,
	"situacao_nova" text NOT NULL,
	"autor_nome" text NOT NULL,
	"registrado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "obra_historico_situacao_anterior_valida" CHECK ("obra_historico"."situacao_anterior" is null or "obra_historico"."situacao_anterior" in ('planejada', 'em_andamento', 'concluida', 'suspensa')),
	CONSTRAINT "obra_historico_situacao_nova_valida" CHECK ("obra_historico"."situacao_nova" in ('planejada', 'em_andamento', 'concluida', 'suspensa'))
);
--> statement-breakpoint
ALTER TABLE "obra_historico" ADD CONSTRAINT "obra_historico_obra_id_obra_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obra"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "obra_atualizado_em_idx" ON "obra" USING btree ("atualizado_em");--> statement-breakpoint
CREATE INDEX "obra_historico_obra_registrado_em_idx" ON "obra_historico" USING btree ("obra_id","registrado_em");