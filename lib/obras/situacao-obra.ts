// Catálogo de situações, categorias e estados de localização da obra (TechSpec EP-04 §2, RN-04.01, PR-01).

export const SITUACOES_OBRA = [
  "planejada",
  "em_andamento",
  "concluida",
  "suspensa",
] as const
export type SituacaoObra = (typeof SITUACOES_OBRA)[number]

export const ROTULO_SITUACAO_OBRA: Record<SituacaoObra, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  suspensa: "Suspensa",
}

/** Forma do marcador no mapa: a situação nunca depende só da cor (DV-20). */
export type FormaMarcadorObra = "circulo" | "triangulo" | "quadrado" | "losango"

export const FORMA_MARCADOR_OBRA: Record<SituacaoObra, FormaMarcadorObra> = {
  planejada: "circulo",
  em_andamento: "triangulo",
  concluida: "quadrado",
  suspensa: "losango",
}

/** Lista da PR-01 do PRD; mudar exige migração do `check` do banco (P-01 do EP-04). */
export const CATEGORIAS_OBRA = [
  "pavimentacao",
  "saneamento",
  "drenagem",
  "edificacao_publica",
  "praca_lazer",
  "iluminacao",
  "outra",
] as const
export type CategoriaObra = (typeof CATEGORIAS_OBRA)[number]

export const ROTULO_CATEGORIA_OBRA: Record<CategoriaObra, string> = {
  pavimentacao: "Pavimentação",
  saneamento: "Saneamento",
  drenagem: "Drenagem",
  edificacao_publica: "Edificação pública",
  praca_lazer: "Praça e lazer",
  iluminacao: "Iluminação",
  outra: "Outra",
}

/** `fora-do-limite` não existe aqui: o ponto fora do município nunca é gravado (RN-04.03). */
export const ESTADOS_LOCALIZACAO_OBRA = [
  "dentro-de-bairro",
  "fora-da-cobertura",
  "sem-localizacao",
] as const
export type EstadoLocalizacaoObra = (typeof ESTADOS_LOCALIZACAO_OBRA)[number]
