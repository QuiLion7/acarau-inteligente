// Pipeline puro da carga: insumos já lidos → artefatos, ou a lista completa de falhas. Sem I/O, sem relógio.
import {
  artefatoCamadasSchema,
  artefatoTerritorioSchema,
  type ArtefatoCamadas,
  type ArtefatoTerritorio,
  type Bairro,
  type CasoFronteira,
  type GeometriaGeoJson,
  type LimiteMunicipal,
  type QualidadeEscolas,
} from "./artefato-schema"
import {
  atribuirPonto,
  type AtribuicaoPonto,
  type BairroGeometrico,
} from "./atribuicao-ponto"
import {
  areaMultiPoligono,
  calcularBbox,
  calcularPontoInterior,
  type MultiPoligono,
  type Posicao,
} from "./geometria"
import type {
  InsumosTerritorio,
  LinhaEscolaCsv,
  ResultadoCarga,
} from "./insumos-carga"
import { formatarNomeBairro } from "./nome-bairro"
import {
  arredondarCoordenada,
  projetarMultiPoligono,
  projetarPosicao,
} from "./projecao"
import { validarCarga } from "./validacao-carga"

export const REGRA_FRONTEIRA =
  "Ponto na fronteira ou em mais de um bairro é atribuído ao bairro de menor código de UV; cada escola conta uma única vez."
// Data de referência da fonte ainda não informada (P-01 do PRD): a tela mostra "Não informada".
const DATA_REFERENCIA_NAO_INFORMADA = null
const FONTE_LEI = "Lei Municipal 2.172/2026, art. 8º, I"
const FONTE_LIMITE = "IPECE"
const FONTE_ESCOLAS = "Catálogo de escolas do INEP (CSV fornecido)"

function paraGeoJson(multiPoligono: MultiPoligono): GeometriaGeoJson {
  return { type: "MultiPolygon", coordinates: multiPoligono }
}

function arredondarUmaCasa(valor: number): number {
  return Math.round(valor * 10) / 10
}

function idDoBairro(uv: number): string {
  return `uv-${String(uv).padStart(2, "0")}`
}

type DadosBairro = {
  registro: InsumosTerritorio["bairros"][number]
  geometriaFonte: MultiPoligono
  totalEscolas: number
  insumos: InsumosTerritorio
}

function montarBairro({
  registro,
  geometriaFonte,
  totalEscolas,
  insumos,
}: DadosBairro): Bairro {
  const linha = insumos.relatorio.find((item) => item.uv === registro.uv)
  const exibicao = projetarMultiPoligono(geometriaFonte)
  const [x, y] = calcularPontoInterior(exibicao)
  return {
    id: idDoBairro(registro.uv),
    uv: registro.uv,
    nome: formatarNomeBairro(registro.bairro),
    nomeLei: registro.bairro.trim(),
    fonte: `${FONTE_LEI}, p. ${registro.pg_pdf}`,
    areaCalculadaM2: arredondarUmaCasa(areaMultiPoligono(geometriaFonte)),
    areaLeiM2: linha?.area_lei_m2 ?? null,
    etiqueta: "DERIVADO_VALIDAR",
    cobertura: "sede",
    versaoGeometria: insumos.versoes.gpkg,
    totalEscolas,
    pontoInterior: [arredondarCoordenada(x), arredondarCoordenada(y)],
    bbox: calcularBbox(exibicao),
    geometria: paraGeoJson(exibicao),
  }
}

function montarLimite(
  insumos: InsumosTerritorio,
  geometriaFonte: MultiPoligono
): LimiteMunicipal {
  const [registro] = insumos.limite
  return {
    nome: registro.Municipio,
    codigoIbge: registro.codigo_ibg,
    fonte: FONTE_LIMITE,
    etiqueta: "OFICIAL_FONTE",
    versao: insumos.versoes.gpkg,
    geometria: paraGeoJson(projetarMultiPoligono(geometriaFonte)),
  }
}

function montarEscola(
  linha: LinhaEscolaCsv,
  posicaoFonte: Posicao | null,
  atribuicao: AtribuicaoPonto,
  versao: string
) {
  return {
    codigoInep: linha.codigoInep,
    nome: linha.nome,
    endereco: linha.endereco,
    dependencia: linha.dependencia,
    localizacao: linha.localizacao,
    situacaoAtendimento: linha.situacaoAtendimento,
    estado: atribuicao.estado,
    bairroId:
      atribuicao.estado === "dentro-de-bairro"
        ? idDoBairro(atribuicao.uvAtribuida)
        : null,
    posicao: posicaoFonte ? projetarPosicao(posicaoFonte) : null,
    etiqueta:
      atribuicao.estado === "sem-localizacao"
        ? "NAO_GEOREFERENCIADO"
        : "OFICIAL_FONTE",
    fonte: FONTE_ESCOLAS,
    versao,
    dataReferencia: DATA_REFERENCIA_NAO_INFORMADA,
  }
}

type EscolasClassificadas = {
  escolas: ReturnType<typeof montarEscola>[]
  casosFronteira: CasoFronteira[]
}

function classificarEscolas(
  insumos: InsumosTerritorio,
  posicoes: (Posicao | null)[],
  limite: MultiPoligono,
  bairros: BairroGeometrico[]
): EscolasClassificadas {
  const posicaoPorInep = new Map(
    insumos.escolasGpkg.map((escola, indice) => [
      escola.cod_inep,
      posicoes[indice],
    ])
  )
  const escolas: EscolasClassificadas["escolas"] = []
  const casosFronteira: CasoFronteira[] = []
  const catalogo = insumos.escolasCsv.toSorted((a, b) =>
    a.codigoInep.localeCompare(b.codigoInep)
  )
  for (const linha of catalogo) {
    const posicao = posicaoPorInep.get(linha.codigoInep) ?? null
    const atribuicao = atribuirPonto(posicao, limite, bairros)
    escolas.push(
      montarEscola(linha, posicao, atribuicao, insumos.versoes.csvEscolas)
    )
    if (atribuicao.estado === "dentro-de-bairro" && atribuicao.tocouFronteira) {
      casosFronteira.push({
        codigoInep: linha.codigoInep,
        uvs: atribuicao.uvsTocadas,
        uvAtribuida: atribuicao.uvAtribuida,
      })
    }
  }
  return { escolas, casosFronteira }
}

function calcularQualidade(
  escolas: EscolasClassificadas["escolas"]
): QualidadeEscolas {
  const com = (estado: string) =>
    escolas.filter((escola) => escola.estado === estado)
  const resumir = (lista: typeof escolas) =>
    lista.map(({ codigoInep, nome }) => ({ codigoInep, nome }))
  const semLocalizacao = com("sem-localizacao")
  const foraDoLimite = com("fora-do-limite")
  return {
    totalCatalogo: escolas.length,
    comLocalizacao: escolas.length - semLocalizacao.length,
    semLocalizacao: semLocalizacao.length,
    dentroDeBairros: com("dentro-de-bairro").length,
    foraDaCobertura: com("fora-da-cobertura").length + foraDoLimite.length,
    foraDoLimite: foraDoLimite.length,
    semLocalizacaoLista: resumir(semLocalizacao),
    foraDoLimiteLista: resumir(foraDoLimite),
  }
}

function montarCamadas(insumos: InsumosTerritorio): ArtefatoCamadas {
  const camada = (
    id: "bairros" | "escolas" | "limite-municipal",
    versao: string,
    registros: number
  ) => ({
    id,
    versao,
    dataReferencia: DATA_REFERENCIA_NAO_INFORMADA,
    registros,
  })
  return artefatoCamadasSchema.parse({
    camadas: [
      camada("bairros", insumos.versoes.gpkg, insumos.bairros.length),
      camada("escolas", insumos.versoes.csvEscolas, insumos.escolasCsv.length),
      camada("limite-municipal", insumos.versoes.gpkg, insumos.limite.length),
    ],
  })
}

export function montarTerritorio(insumos: InsumosTerritorio): ResultadoCarga {
  const { falhas, geometrias } = validarCarga(insumos)
  const decodificados = geometrias.bairros.filter(
    (geometria): geometria is MultiPoligono => geometria !== null
  )
  if (
    falhas.length > 0 ||
    !geometrias.limite ||
    decodificados.length !== insumos.bairros.length
  ) {
    return { ok: false, falhas }
  }

  const bairrosGeometricos = insumos.bairros.map((registro, indice) => ({
    uv: registro.uv,
    geometria: decodificados[indice],
  }))
  const { escolas, casosFronteira } = classificarEscolas(
    insumos,
    geometrias.escolas,
    geometrias.limite,
    bairrosGeometricos
  )
  const bairros = insumos.bairros
    .map((registro, indice) =>
      montarBairro({
        registro,
        geometriaFonte: decodificados[indice],
        totalEscolas: escolas.filter(
          (escola) => escola.bairroId === idDoBairro(registro.uv)
        ).length,
        insumos,
      })
    )
    .toSorted((a, b) => a.uv - b.uv)
  const territorio: ArtefatoTerritorio = artefatoTerritorioSchema.parse({
    versaoArtefato: 1,
    regraFronteira: REGRA_FRONTEIRA,
    casosFronteira,
    limite: montarLimite(insumos, geometrias.limite),
    bairros,
    escolas,
    qualidade: calcularQualidade(escolas),
  })
  return { ok: true, territorio, camadas: montarCamadas(insumos) }
}
