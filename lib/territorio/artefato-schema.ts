// Contrato dos dois artefatos gerados pela carga (TechSpec EP-01 §4). A carga valida a saída e o app valida a leitura.
import { z } from "zod"

export const DEPENDENCIAS_ESCOLA = [
  "Municipal",
  "Estadual",
  "Federal",
  "Privada",
] as const
export const LOCALIZACOES_ESCOLA = ["Urbana", "Rural"] as const

const posicaoSchema = z.tuple([z.number(), z.number()])
const bboxSchema = z.tuple([z.number(), z.number(), z.number(), z.number()])
const multiPoligonoSchema = z.strictObject({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(z.array(z.array(posicaoSchema))),
})

const bairroSchema = z.strictObject({
  id: z.string().regex(/^uv-\d{2}$/),
  uv: z.number().int().min(1),
  nome: z.string().min(1),
  nomeLei: z.string().min(1),
  fonte: z.string().min(1),
  areaCalculadaM2: z.number().positive(),
  areaLeiM2: z.number().positive().nullable(),
  etiqueta: z.literal("DERIVADO_VALIDAR"),
  cobertura: z.literal("sede"),
  versaoGeometria: z.string().min(1),
  totalEscolas: z.number().int().min(0),
  pontoInterior: posicaoSchema,
  bbox: bboxSchema,
  geometria: multiPoligonoSchema,
})

const limiteMunicipalSchema = z.strictObject({
  nome: z.string().min(1),
  codigoIbge: z.string().min(1),
  fonte: z.string().min(1),
  etiqueta: z.literal("OFICIAL_FONTE"),
  versao: z.string().min(1),
  geometria: multiPoligonoSchema,
})

const estadoEscolaSchema = z.enum([
  "dentro-de-bairro",
  "fora-da-cobertura",
  "fora-do-limite",
  "sem-localizacao",
])

const escolaSchema = z.strictObject({
  codigoInep: z.string().regex(/^\d{8}$/),
  nome: z.string().min(1),
  endereco: z.string().min(1),
  dependencia: z.enum(DEPENDENCIAS_ESCOLA),
  localizacao: z.enum(LOCALIZACOES_ESCOLA),
  situacaoAtendimento: z.string().min(1),
  estado: estadoEscolaSchema,
  bairroId: z.string().nullable(),
  posicao: posicaoSchema.nullable(),
  etiqueta: z.enum(["OFICIAL_FONTE", "NAO_GEOREFERENCIADO"]),
  fonte: z.string().min(1),
  versao: z.string().min(1),
  dataReferencia: z.string().nullable(),
})

const escolaResumoSchema = z.strictObject({
  codigoInep: z.string(),
  nome: z.string(),
})

const qualidadeEscolasSchema = z.strictObject({
  totalCatalogo: z.number().int().min(0),
  comLocalizacao: z.number().int().min(0),
  semLocalizacao: z.number().int().min(0),
  dentroDeBairros: z.number().int().min(0),
  foraDaCobertura: z.number().int().min(0),
  foraDoLimite: z.number().int().min(0),
  semLocalizacaoLista: z.array(escolaResumoSchema),
  foraDoLimiteLista: z.array(escolaResumoSchema),
})

const casoFronteiraSchema = z.strictObject({
  codigoInep: z.string(),
  uvs: z.array(z.number().int()),
  uvAtribuida: z.number().int(),
})

export const artefatoTerritorioSchema = z.strictObject({
  versaoArtefato: z.literal(1),
  regraFronteira: z.string().min(1),
  casosFronteira: z.array(casoFronteiraSchema),
  limite: limiteMunicipalSchema,
  bairros: z.array(bairroSchema),
  escolas: z.array(escolaSchema),
  qualidade: qualidadeEscolasSchema,
})

export const artefatoCamadasSchema = z.strictObject({
  camadas: z.array(
    z.strictObject({
      id: z.enum(["bairros", "escolas", "limite-municipal"]),
      versao: z.string().min(1),
      dataReferencia: z.string().nullable(),
      registros: z.number().int().min(0),
    })
  ),
})

export type Bairro = z.infer<typeof bairroSchema>
export type Escola = z.infer<typeof escolaSchema>
export type EstadoEscola = z.infer<typeof estadoEscolaSchema>
export type LimiteMunicipal = z.infer<typeof limiteMunicipalSchema>
export type QualidadeEscolas = z.infer<typeof qualidadeEscolasSchema>
export type CasoFronteira = z.infer<typeof casoFronteiraSchema>
export type ArtefatoTerritorio = z.infer<typeof artefatoTerritorioSchema>
export type ArtefatoCamadas = z.infer<typeof artefatoCamadasSchema>
export type GeometriaGeoJson = z.infer<typeof multiPoligonoSchema>

/** O que a faixa de contexto, a lista e a busca precisam saber de um bairro, sem geometria. */
export type BairroResumo = Pick<Bairro, "id" | "uv" | "nome" | "nomeLei">

export type DadosTerritorio = {
  bairros: Bairro[]
  limite: LimiteMunicipal
  escolas: Escola[]
  qualidade: QualidadeEscolas
}

export type DadosMapaResumo = {
  bairros: Bairro[]
  limite: LimiteMunicipal
}
