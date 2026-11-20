// Contrato de entrada da carga do território: o que o script lê dos arquivos e entrega ao pipeline puro.
import type { ArtefatoCamadas, ArtefatoTerritorio } from "./artefato-schema"

export type RegistroBairroGpkg = {
  fid: number
  uv: number
  bairro: string
  lei: string
  pg_pdf: number
  status: string
  geom: Uint8Array
}

export type RegistroLimiteGpkg = {
  Municipio: string
  codigo_ibg: string
  geom: Uint8Array
}

export type RegistroEscolaGpkg = {
  cod_inep: string
  geom: Uint8Array
}

/** Linha do catálogo do INEP, só com as colunas do contrato (telefone, porte e etapas ficam de fora). */
export type LinhaEscolaCsv = {
  codigoInep: string
  nome: string
  endereco: string
  dependencia: string
  localizacao: string
  situacaoAtendimento: string
  coordenadasValidas: boolean
}

export type LinhaRelatorioBairro = {
  uv: number
  area_calc_m2: number
  area_lei_m2: number | null
  inicio_pdf: number
}

export type InsumosTerritorio = {
  bairros: RegistroBairroGpkg[]
  limite: RegistroLimiteGpkg[]
  relatorio: LinhaRelatorioBairro[]
  /** Pontos de escola do `.gpkg` (58). */
  escolasGpkg: RegistroEscolaGpkg[]
  /** Catálogo do INEP (62 linhas): atributos de todas as escolas. */
  escolasCsv: LinhaEscolaCsv[]
  /** `srs_id` declarado no `gpkg_geometry_columns` de cada tabela lida. */
  srs: { bairros: number; limite: number; escolas: number }
  /** sha256 do insumo, 12 hex. */
  versoes: { gpkg: string; relatorio: string; csvEscolas: string }
}

export type RegraFalhaCarga =
  | "UV_QUANTIDADE"
  | "UV_DUPLICADA"
  | "UV_SEM_RELATORIO"
  | "AREA_DIVERGENTE"
  | "GEOMETRIA_INVALIDA"
  | "SRC_INESPERADO"
  | "LIMITE_QUANTIDADE"
  | "ESCOLA_QUANTIDADE"
  | "INEP_DUPLICADO"
  | "SEM_COORDENADA_QUANTIDADE"
  | "INEP_INCOERENTE"
  | "CAMPO_OBRIGATORIO"

export type FalhaCarga = { regra: RegraFalhaCarga; mensagem: string }

export type ResultadoCarga =
  | { ok: true; territorio: ArtefatoTerritorio; camadas: ArtefatoCamadas }
  | { ok: false; falhas: FalhaCarga[] }
