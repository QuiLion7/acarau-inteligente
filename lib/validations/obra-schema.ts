import { z } from "zod"

import {
  CATEGORIAS_OBRA,
  ESTADOS_LOCALIZACAO_OBRA,
  SITUACOES_OBRA,
} from "@/lib/obras/situacao-obra"
import {
  arredondarCoordenada,
  lerCoordenada,
  lerValorEmReais,
  VALOR_MAXIMO_CENTAVOS,
} from "@/lib/obras/valores-obra"

// Contratos da obra (TechSpec EP-04 §4). `obraEntradaSchema` vale para a rota e `obraFormularioSchema` para o
// formulário: o texto digitado é convertido e passa pelos mesmos sub-schemas, que ficam definidos uma só vez
// (react-next.md §6, seguranca.md §6). Nenhuma mensagem repete o valor recusado.

export const TITULO_OBRA_MINIMO = 3
export const TITULO_OBRA_MAXIMO = 120
export const DESCRICAO_OBRA_MAXIMO = 2000
export const SECRETARIA_OBRA_MAXIMO = 120

const MENSAGEM_LATITUDE = "A latitude deve ficar entre -90 e 90."
const MENSAGEM_LONGITUDE = "A longitude deve ficar entre -180 e 180."
const MENSAGEM_DATA = "Informe uma data válida."
const MENSAGEM_DATA_PREVISTA =
  "A data prevista não pode ser anterior à data de início."
const MENSAGEM_VALOR_NEGATIVO = "O valor previsto não pode ser negativo."
const MENSAGEM_VALOR_INVALIDO = "Informe o valor em reais, como 250.000,00."
const MENSAGEM_VALOR_ACIMA_DO_TETO =
  "O valor previsto passa do limite de R$ 10 bilhões."
const MENSAGEM_COORDENADA_INVALIDA =
  "Informe um número em graus decimais, como -2,885116."
const MENSAGEM_PAR_LATITUDE = "Informe também a latitude."
const MENSAGEM_PAR_LONGITUDE = "Informe também a longitude."

export const idObraSchema = z.uuid()

export const situacaoObraSchema = z.enum(SITUACOES_OBRA, {
  error: "Escolha uma das situações permitidas.",
})
export const categoriaObraSchema = z.enum(CATEGORIAS_OBRA, {
  error: "Escolha uma das categorias da lista.",
})

const tituloSchema = z
  .string("Informe o título da obra.")
  .trim()
  .min(
    TITULO_OBRA_MINIMO,
    `O título deve ter pelo menos ${TITULO_OBRA_MINIMO} caracteres.`
  )
  .max(
    TITULO_OBRA_MAXIMO,
    `O título deve ter no máximo ${TITULO_OBRA_MAXIMO} caracteres.`
  )

/** Texto opcional: espaços nas pontas saem e vazio vira `null` (campo ausente é `null`, TechSpec §4). */
function textoOpcional(maximo: number, mensagemMaximo: string) {
  return z
    .string(mensagemMaximo)
    .trim()
    .max(maximo, mensagemMaximo)
    .nullish()
    .transform((texto) => (texto ? texto : null))
}

const descricaoSchema = textoOpcional(
  DESCRICAO_OBRA_MAXIMO,
  `A descrição deve ter no máximo ${DESCRICAO_OBRA_MAXIMO} caracteres.`
)
const secretariaSchema = textoOpcional(
  SECRETARIA_OBRA_MAXIMO,
  `A secretaria deve ter no máximo ${SECRETARIA_OBRA_MAXIMO} caracteres.`
)

const dataSchema = z.iso.date(MENSAGEM_DATA)
const dataOpcionalSchema = dataSchema
  .nullish()
  .transform((data) => data ?? null)

const valorCentavosSchema = z
  .number(MENSAGEM_VALOR_INVALIDO)
  .int(MENSAGEM_VALOR_INVALIDO)
  .min(0, MENSAGEM_VALOR_NEGATIVO)
  .max(VALOR_MAXIMO_CENTAVOS, MENSAGEM_VALOR_ACIMA_DO_TETO)
  .nullish()
  .transform((valor) => valor ?? null)

const latitudeSchema = z
  .number(MENSAGEM_COORDENADA_INVALIDA)
  .min(-90, MENSAGEM_LATITUDE)
  .max(90, MENSAGEM_LATITUDE)
  .transform(arredondarCoordenada)
const longitudeSchema = z
  .number(MENSAGEM_COORDENADA_INVALIDA)
  .min(-180, MENSAGEM_LONGITUDE)
  .max(180, MENSAGEM_LONGITUDE)
  .transform(arredondarCoordenada)

export const pontoObraSchema = z.object({
  longitude: longitudeSchema,
  latitude: latitudeSchema,
})
export type PontoObra = z.infer<typeof pontoObraSchema>

const camposDaObra = {
  titulo: tituloSchema,
  situacao: situacaoObraSchema,
  descricao: descricaoSchema,
  categoria: categoriaObraSchema.nullish().transform((valor) => valor ?? null),
  secretaria: secretariaSchema,
  dataInicio: dataOpcionalSchema,
  dataPrevista: dataOpcionalSchema,
  valorPrevistoCentavos: valorCentavosSchema,
}

type DatasDaObra = { dataInicio: string | null; dataPrevista: string | null }

/** RN-04.04: a data prevista, quando as duas existem, não vem antes do início (datas `YYYY-MM-DD` comparam como texto). */
function dataPrevistaAnteriorAoInicio({
  dataInicio,
  dataPrevista,
}: DatasDaObra): boolean {
  return Boolean(dataInicio && dataPrevista && dataPrevista < dataInicio)
}

/** Corpo de `POST` e `PUT`. Chaves desconhecidas (`bairroId`, `proveniencia`) são descartadas (RN-04.07, RN-04.08). */
export const obraEntradaSchema = z
  .object({
    ...camposDaObra,
    localizacao: pontoObraSchema.nullish().transform((ponto) => ponto ?? null),
  })
  .superRefine((entrada, contexto) => {
    if (dataPrevistaAnteriorAoInicio(entrada)) {
      contexto.addIssue({
        code: "custom",
        path: ["dataPrevista"],
        message: MENSAGEM_DATA_PREVISTA,
      })
    }
  })
export type ObraEntrada = z.infer<typeof obraEntradaSchema>

type Problema = { campo: string; mensagem: string }

/** Passa o número pelo mesmo sub-schema da rota; o erro vira problema do campo do formulário. */
function validarNumero(
  schema: z.ZodType<number | null>,
  numero: number | null,
  campo: string,
  problemas: Problema[]
): number | null {
  if (numero === null) return null
  const resultado = schema.safeParse(numero)
  if (resultado.success) return resultado.data
  problemas.push({ campo, mensagem: resultado.error.issues[0].message })
  return null
}

function converterValor(texto: string, problemas: Problema[]): number | null {
  const limpo = texto.trim()
  if (limpo === "") return null
  const centavos = lerValorEmReais(limpo)
  if (centavos === null) {
    const mensagem = limpo.startsWith("-")
      ? MENSAGEM_VALOR_NEGATIVO
      : MENSAGEM_VALOR_INVALIDO
    problemas.push({ campo: "valorPrevisto", mensagem })
    return null
  }
  return validarNumero(
    valorCentavosSchema,
    centavos,
    "valorPrevisto",
    problemas
  )
}

function converterCoordenada(
  texto: string,
  schema: z.ZodType<number | null>,
  campo: string,
  problemas: Problema[]
): number | null {
  const numero = lerCoordenada(texto)
  if (numero === null) {
    problemas.push({ campo, mensagem: MENSAGEM_COORDENADA_INVALIDA })
    return null
  }
  return validarNumero(schema, numero, campo, problemas)
}

/** Latitude e longitude juntas ou nenhuma: só uma preenchida é erro no campo que falta (CA-04.08). */
function converterLocalizacao(
  textoLatitude: string,
  textoLongitude: string,
  problemas: Problema[]
): PontoObra | null {
  const [latitude, longitude] = [textoLatitude.trim(), textoLongitude.trim()]
  if (latitude === "" && longitude === "") return null
  if (latitude === "" || longitude === "") {
    problemas.push(
      latitude === ""
        ? { campo: "latitude", mensagem: MENSAGEM_PAR_LATITUDE }
        : { campo: "longitude", mensagem: MENSAGEM_PAR_LONGITUDE }
    )
    return null
  }
  const ponto = {
    latitude: converterCoordenada(
      latitude,
      latitudeSchema,
      "latitude",
      problemas
    ),
    longitude: converterCoordenada(
      longitude,
      longitudeSchema,
      "longitude",
      problemas
    ),
  }
  return ponto.latitude === null || ponto.longitude === null
    ? null
    : { latitude: ponto.latitude, longitude: ponto.longitude }
}

const camposDoFormulario = z.object({
  titulo: tituloSchema,
  situacao: situacaoObraSchema,
  descricao: descricaoSchema,
  categoria: z.union([categoriaObraSchema, z.literal("")]),
  secretaria: secretariaSchema,
  dataInicio: z.union([dataSchema, z.literal("")]),
  dataPrevista: z.union([dataSchema, z.literal("")]),
  valorPrevisto: z.string(),
  latitude: z.string(),
  longitude: z.string(),
})
type ValoresFormulario = z.output<typeof camposDoFormulario>

function converterFormulario(valores: ValoresFormulario): {
  entrada: ObraEntrada
  problemas: Problema[]
} {
  const problemas: Problema[] = []
  const [dataInicio, dataPrevista] = [
    valores.dataInicio || null,
    valores.dataPrevista || null,
  ]
  if (dataPrevistaAnteriorAoInicio({ dataInicio, dataPrevista })) {
    problemas.push({ campo: "dataPrevista", mensagem: MENSAGEM_DATA_PREVISTA })
  }
  const entrada: ObraEntrada = {
    titulo: valores.titulo,
    situacao: valores.situacao,
    descricao: valores.descricao,
    categoria: valores.categoria || null,
    secretaria: valores.secretaria,
    dataInicio,
    dataPrevista,
    valorPrevistoCentavos: converterValor(valores.valorPrevisto, problemas),
    localizacao: converterLocalizacao(
      valores.latitude,
      valores.longitude,
      problemas
    ),
  }
  return { entrada, problemas }
}

/**
 * Os valores do TanStack Form: tudo texto (coordenadas separadas, valor em pt-BR, datas do `<input type="date">`).
 * Passa pelos mesmos sub-schemas da rota e devolve a `ObraEntrada` que ela receberia. O ponto fora do município não
 * está aqui: depende do território (o form usa `localizarObra`).
 */
export const obraFormularioSchema = camposDoFormulario
  .superRefine((valores, contexto) => {
    for (const { campo, mensagem } of converterFormulario(valores).problemas) {
      contexto.addIssue({ code: "custom", path: [campo], message: mensagem })
    }
  })
  .transform((valores) => converterFormulario(valores).entrada)
export type ObraFormulario = z.input<typeof obraFormularioSchema>

export const entradaHistoricoSchema = z.object({
  situacaoAnterior: situacaoObraSchema.nullable(),
  situacaoNova: situacaoObraSchema,
  autorNome: z.string(),
  registradoEm: z.iso.datetime(),
})
export type EntradaHistorico = z.infer<typeof entradaHistoricoSchema>

/** Resposta das rotas e prop da página (TechSpec §4): a entrada como gravada, mais o que o servidor calcula. */
export const obraSchema = z.object({
  id: z.uuid(),
  titulo: z.string(),
  situacao: situacaoObraSchema,
  descricao: z.string().nullable(),
  categoria: categoriaObraSchema.nullable(),
  secretaria: z.string().nullable(),
  dataInicio: z.iso.date().nullable(),
  dataPrevista: z.iso.date().nullable(),
  valorPrevistoCentavos: z.number().int().nonnegative().nullable(),
  localizacao: pontoObraSchema.nullable(),
  estadoLocalizacao: z.enum(ESTADOS_LOCALIZACAO_OBRA),
  bairroId: z.string().nullable(),
  proveniencia: z.literal("SINTETICO"),
  atualizadoEm: z.iso.datetime(),
  historico: z.array(entradaHistoricoSchema).min(1),
})
export type Obra = z.infer<typeof obraSchema>
