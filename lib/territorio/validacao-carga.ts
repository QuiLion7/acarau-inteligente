// Regras do RF-01.02 sobre os insumos da carga (TechSpec EP-01 §4.5). Devolve todas as falhas de uma vez,
// uma por regra violada, e as geometrias já decodificadas para o pipeline não decodificar de novo.
import { DEPENDENCIAS_ESCOLA, LOCALIZACOES_ESCOLA } from "./artefato-schema"
import { decodificarMultiPoligono, decodificarPonto } from "./geopackage"
import {
  areaMultiPoligono,
  validarAnel,
  type MultiPoligono,
  type Posicao,
} from "./geometria"
import type {
  FalhaCarga,
  InsumosTerritorio,
  RegraFalhaCarga,
} from "./insumos-carga"

// Descrevem a base fornecida: trocar a base é trocar estes números no mesmo commit.
export const TOTAL_UVS = 24
export const TOTAL_LIMITES = 1
export const TOTAL_ESCOLAS_COM_PONTO = 58
export const TOTAL_ESCOLAS_CATALOGO = 62
export const TOTAL_SEM_COORDENADA = 4
export const SRC_ESPERADO = 31984
const TOLERANCIA_AREA_PERCENTUAL = 0.01

export type GeometriasDecodificadas = {
  /** Alinhado a `insumos.bairros`; `null` quando o blob não decodifica. */
  bairros: (MultiPoligono | null)[]
  limite: MultiPoligono | null
  /** Alinhado a `insumos.escolasGpkg`; `null` quando o ponto não decodifica ou não é finito. */
  escolas: (Posicao | null)[]
}

export type ResultadoValidacao = {
  falhas: FalhaCarga[]
  geometrias: GeometriasDecodificadas
}

type Acumulador = Partial<Record<RegraFalhaCarga, string[]>>

function registrar(
  acumulador: Acumulador,
  regra: RegraFalhaCarga,
  detalhe: string
) {
  acumulador[regra] = [...(acumulador[regra] ?? []), detalhe]
}

function repetidos<T>(valores: T[]): T[] {
  return [...new Set(valores.filter((v, i) => valores.indexOf(v) !== i))]
}

function descreverMotivo(erro: unknown): string {
  return erro instanceof Error ? erro.message : "erro desconhecido"
}

function decodificar(blob: Uint8Array, rotulo: string, acumulador: Acumulador) {
  try {
    return decodificarMultiPoligono(blob)
  } catch (erro) {
    registrar(
      acumulador,
      "GEOMETRIA_INVALIDA",
      `${rotulo}: ${descreverMotivo(erro)}`
    )
    return null
  }
}

function validarAneis(
  multiPoligono: MultiPoligono,
  rotulo: string,
  acumulador: Acumulador
) {
  for (const motivo of new Set(multiPoligono.flat().map(validarAnel))) {
    if (motivo)
      registrar(
        acumulador,
        "GEOMETRIA_INVALIDA",
        `${rotulo}: anel inválido (${motivo})`
      )
  }
  if (areaMultiPoligono(multiPoligono) <= 0) {
    registrar(acumulador, "GEOMETRIA_INVALIDA", `${rotulo}: área não positiva`)
  }
}

function validarSrc(insumos: InsumosTerritorio, acumulador: Acumulador) {
  for (const [camada, srs] of Object.entries(insumos.srs)) {
    if (srs !== SRC_ESPERADO) {
      registrar(
        acumulador,
        "SRC_INESPERADO",
        `${camada} em EPSG:${srs} (esperado EPSG:${SRC_ESPERADO})`
      )
    }
  }
}

function validarUvs(insumos: InsumosTerritorio, acumulador: Acumulador) {
  const { bairros, relatorio } = insumos
  if (bairros.length !== TOTAL_UVS) {
    registrar(
      acumulador,
      "UV_QUANTIDADE",
      `esperadas ${TOTAL_UVS} UVs, encontradas ${bairros.length}`
    )
  }
  const codigosRepetidos = repetidos(bairros.map((bairro) => bairro.uv))
  const nomesRepetidos = repetidos(
    bairros.map((bairro) => bairro.bairro.trim().toUpperCase())
  )
  if (codigosRepetidos.length > 0) {
    registrar(
      acumulador,
      "UV_DUPLICADA",
      `código de UV repetido: ${codigosRepetidos.join(", ")}`
    )
  }
  if (nomesRepetidos.length > 0) {
    registrar(
      acumulador,
      "UV_DUPLICADA",
      `nome de bairro repetido: ${nomesRepetidos.join(", ")}`
    )
  }
  const comRelatorio = new Set(relatorio.map((linha) => linha.uv))
  const semRelatorio = bairros.filter((bairro) => !comRelatorio.has(bairro.uv))
  if (semRelatorio.length > 0) {
    registrar(
      acumulador,
      "UV_SEM_RELATORIO",
      `UV sem linha no relatório: ${semRelatorio.map((b) => b.uv).join(", ")}`
    )
  }
}

function validarBairrosGeometricos(
  insumos: InsumosTerritorio,
  acumulador: Acumulador
): (MultiPoligono | null)[] {
  return insumos.bairros.map((bairro) => {
    const rotulo = `UV ${bairro.uv}`
    const multiPoligono = decodificar(bairro.geom, rotulo, acumulador)
    if (!multiPoligono) return null
    validarAneis(multiPoligono, rotulo, acumulador)
    const linha = insumos.relatorio.find((item) => item.uv === bairro.uv)
    if (!linha) return multiPoligono
    const diferenca =
      (Math.abs(areaMultiPoligono(multiPoligono) - linha.area_calc_m2) /
        linha.area_calc_m2) *
      100
    if (!(diferenca <= TOLERANCIA_AREA_PERCENTUAL)) {
      registrar(
        acumulador,
        "AREA_DIVERGENTE",
        `UV ${bairro.uv}: ${diferenca.toFixed(4)}% de diferença para o relatório`
      )
    }
    return multiPoligono
  })
}

function validarLimite(
  insumos: InsumosTerritorio,
  acumulador: Acumulador
): MultiPoligono | null {
  if (insumos.limite.length !== TOTAL_LIMITES) {
    registrar(
      acumulador,
      "LIMITE_QUANTIDADE",
      `esperado ${TOTAL_LIMITES} polígono de limite, encontrados ${insumos.limite.length}`
    )
    return null
  }
  const multiPoligono = decodificar(
    insumos.limite[0].geom,
    "limite municipal",
    acumulador
  )
  if (multiPoligono) validarAneis(multiPoligono, "limite municipal", acumulador)
  return multiPoligono
}

function validarQuantidadesDeEscola(
  insumos: InsumosTerritorio,
  acumulador: Acumulador
) {
  const { escolasGpkg, escolasCsv } = insumos
  if (
    escolasGpkg.length !== TOTAL_ESCOLAS_COM_PONTO ||
    escolasCsv.length !== TOTAL_ESCOLAS_CATALOGO
  ) {
    registrar(
      acumulador,
      "ESCOLA_QUANTIDADE",
      `esperados ${TOTAL_ESCOLAS_COM_PONTO} pontos no GeoPackage e ${TOTAL_ESCOLAS_CATALOGO} linhas no catálogo, encontrados ${escolasGpkg.length} e ${escolasCsv.length}`
    )
  }
  const repetidosNoGpkg = repetidos(
    escolasGpkg.map((escola) => escola.cod_inep)
  )
  const repetidosNoCsv = repetidos(
    escolasCsv.map((escola) => escola.codigoInep)
  )
  if (repetidosNoGpkg.length > 0) {
    registrar(
      acumulador,
      "INEP_DUPLICADO",
      `no GeoPackage: ${repetidosNoGpkg.join(", ")}`
    )
  }
  if (repetidosNoCsv.length > 0) {
    registrar(
      acumulador,
      "INEP_DUPLICADO",
      `no catálogo: ${repetidosNoCsv.join(", ")}`
    )
  }
  const semCoordenada = escolasCsv.filter(
    (escola) => !escola.coordenadasValidas
  )
  if (semCoordenada.length !== TOTAL_SEM_COORDENADA) {
    registrar(
      acumulador,
      "SEM_COORDENADA_QUANTIDADE",
      `esperadas ${TOTAL_SEM_COORDENADA} escolas sem coordenada, encontradas ${semCoordenada.length}`
    )
  }
}

function validarCoerenciaDeInep(
  insumos: InsumosTerritorio,
  acumulador: Acumulador
) {
  const comPonto = new Set(insumos.escolasGpkg.map((escola) => escola.cod_inep))
  const noCatalogo = new Set(
    insumos.escolasCsv.map((escola) => escola.codigoInep)
  )
  const semCoordenadaComPonto = insumos.escolasCsv.filter(
    (escola) => !escola.coordenadasValidas && comPonto.has(escola.codigoInep)
  )
  const comCoordenadaSemPonto = insumos.escolasCsv.filter(
    (escola) => escola.coordenadasValidas && !comPonto.has(escola.codigoInep)
  )
  const pontoForaDoCatalogo = [...comPonto].filter(
    (inep) => !noCatalogo.has(inep)
  )
  const detalhes: [string, string[]][] = [
    [
      "sem coordenada no catálogo, mas com ponto no GeoPackage",
      semCoordenadaComPonto.map((e) => e.codigoInep),
    ],
    [
      "com coordenada no catálogo, mas sem ponto no GeoPackage",
      comCoordenadaSemPonto.map((e) => e.codigoInep),
    ],
    ["ponto no GeoPackage sem linha no catálogo", pontoForaDoCatalogo],
  ]
  for (const [descricao, codigos] of detalhes) {
    if (codigos.length > 0)
      registrar(
        acumulador,
        "INEP_INCOERENTE",
        `${descricao}: ${codigos.join(", ")}`
      )
  }
}

function validarCamposDeEscola(
  insumos: InsumosTerritorio,
  acumulador: Acumulador
) {
  for (const escola of insumos.escolasCsv) {
    const problemas = [
      ...(["nome", "endereco", "situacaoAtendimento"] as const)
        .filter((campo) => escola[campo].trim() === "")
        .map((campo) => `${campo} vazio`),
      ...(DEPENDENCIAS_ESCOLA.some((valor) => valor === escola.dependencia)
        ? []
        : [`dependência fora do domínio ("${escola.dependencia}")`]),
      ...(LOCALIZACOES_ESCOLA.some((valor) => valor === escola.localizacao)
        ? []
        : [`localização fora do domínio ("${escola.localizacao}")`]),
    ]
    if (problemas.length > 0) {
      registrar(
        acumulador,
        "CAMPO_OBRIGATORIO",
        `INEP ${escola.codigoInep}: ${problemas.join(", ")}`
      )
    }
  }
}

function decodificarPontosDeEscola(
  insumos: InsumosTerritorio,
  acumulador: Acumulador
): (Posicao | null)[] {
  return insumos.escolasGpkg.map((escola) => {
    try {
      const posicao = decodificarPonto(escola.geom)
      if (posicao.every(Number.isFinite)) return posicao
      registrar(
        acumulador,
        "GEOMETRIA_INVALIDA",
        `escola INEP ${escola.cod_inep}: coordenada não finita`
      )
    } catch (erro) {
      registrar(
        acumulador,
        "GEOMETRIA_INVALIDA",
        `escola INEP ${escola.cod_inep}: ${descreverMotivo(erro)}`
      )
    }
    return null
  })
}

export function validarCarga(insumos: InsumosTerritorio): ResultadoValidacao {
  const acumulador: Acumulador = {}
  validarSrc(insumos, acumulador)
  validarUvs(insumos, acumulador)
  const bairros = validarBairrosGeometricos(insumos, acumulador)
  const limite = validarLimite(insumos, acumulador)
  validarQuantidadesDeEscola(insumos, acumulador)
  validarCoerenciaDeInep(insumos, acumulador)
  validarCamposDeEscola(insumos, acumulador)
  const escolas = decodificarPontosDeEscola(insumos, acumulador)
  const falhas = (
    Object.entries(acumulador) as [RegraFalhaCarga, string[]][]
  ).map(([regra, detalhes]) => ({ regra, mensagem: detalhes.join("; ") }))
  return { falhas, geometrias: { bairros, limite, escolas } }
}
