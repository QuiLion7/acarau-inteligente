// Monta blobs GeoPackage e geometrias mínimas em EPSG:31984 para os testes da carga.
import type { Anel, MultiPoligono, Poligono, Posicao } from "../geometria"
import type {
  InsumosTerritorio,
  LinhaEscolaCsv,
  LinhaRelatorioBairro,
  RegistroBairroGpkg,
  RegistroEscolaGpkg,
} from "../insumos-carga"

const SRS_31984 = 31984
const TIPO_POINT = 1
const TIPO_POLYGON = 3
const TIPO_MULTIPOLYGON = 6
const FLAG_LITTLE_ENDIAN = 1
const BYTES_ENVELOPE = [0, 32, 48, 48, 64] as const

export type OpcoesBlob = {
  envelope?: 0 | 1 | 4
  littleEndian?: boolean
}

function uint32(valor: number, littleEndian: boolean): number[] {
  const visao = new DataView(new ArrayBuffer(4))
  visao.setUint32(0, valor, littleEndian)
  return [...new Uint8Array(visao.buffer)]
}

function float64(valor: number, littleEndian: boolean): number[] {
  const visao = new DataView(new ArrayBuffer(8))
  visao.setFloat64(0, valor, littleEndian)
  return [...new Uint8Array(visao.buffer)]
}

function cabecalhoWkb(tipo: number, littleEndian: boolean): number[] {
  return [littleEndian ? 1 : 0, ...uint32(tipo, littleEndian)]
}

function bytesPosicao([x, y]: Posicao, littleEndian: boolean): number[] {
  return [...float64(x, littleEndian), ...float64(y, littleEndian)]
}

export function wkbPonto(posicao: Posicao, littleEndian = true): number[] {
  return [
    ...cabecalhoWkb(TIPO_POINT, littleEndian),
    ...bytesPosicao(posicao, littleEndian),
  ]
}

function corpoPoligono(poligono: Poligono, littleEndian: boolean): number[] {
  return [
    ...uint32(poligono.length, littleEndian),
    ...poligono.flatMap((anel) => [
      ...uint32(anel.length, littleEndian),
      ...anel.flatMap((posicao) => bytesPosicao(posicao, littleEndian)),
    ]),
  ]
}

export function wkbPoligono(poligono: Poligono, littleEndian = true): number[] {
  return [
    ...cabecalhoWkb(TIPO_POLYGON, littleEndian),
    ...corpoPoligono(poligono, littleEndian),
  ]
}

export function wkbMultiPoligono(
  poligonos: MultiPoligono,
  littleEndian = true
): number[] {
  return [
    ...cabecalhoWkb(TIPO_MULTIPOLYGON, littleEndian),
    ...uint32(poligonos.length, littleEndian),
    ...poligonos.flatMap((poligono) => wkbPoligono(poligono, littleEndian)),
  ]
}

/** Cabeçalho GP: assinatura, versão 0, flags, `srs_id` e envelope de 0, 32 ou 64 bytes. */
export function blobGpkg(
  wkb: number[],
  { envelope = 0, littleEndian = true }: OpcoesBlob = {}
): Uint8Array {
  const indicador = envelope
  const flags = (indicador << 1) | (littleEndian ? FLAG_LITTLE_ENDIAN : 0)
  const bytesEnvelope = new Array<number>(BYTES_ENVELOPE[indicador]).fill(0)
  return Uint8Array.from([
    0x47,
    0x50,
    0,
    flags,
    ...uint32(SRS_31984, littleEndian),
    ...bytesEnvelope,
    ...wkb,
  ])
}

/** Quadrado fechado de `lado` metros com canto inferior esquerdo em `[x, y]`. */
export function quadrado(x: number, y: number, lado: number): Anel {
  return [
    [x, y],
    [x + lado, y],
    [x + lado, y + lado],
    [x, y + lado],
    [x, y],
  ]
}

/** Canto de partida dos quadrados de teste: ponto plausível em UTM 24S, na região de Acaraú. */
export const ORIGEM_X = 380000
export const ORIGEM_Y = 9680000
export const LADO_BAIRRO = 1000

export function blobQuadrado(x: number, y: number, lado: number): Uint8Array {
  return blobGpkg(wkbMultiPoligono([[quadrado(x, y, lado)]]))
}

function bairroNaGrade(uv: number): RegistroBairroGpkg {
  const coluna = (uv - 1) % 6
  const linha = Math.floor((uv - 1) / 6)
  return {
    fid: uv,
    uv,
    bairro: `BAIRRO ${uv}`,
    lei: "2172/2026",
    pg_pdf: 26 + uv,
    status: "VALIDADO",
    geom: blobQuadrado(
      ORIGEM_X + coluna * LADO_BAIRRO,
      ORIGEM_Y + linha * LADO_BAIRRO,
      LADO_BAIRRO
    ),
  }
}

const ESCOLAS_DENTRO = 24
const ESCOLAS_FORA_DA_COBERTURA = 33
const ESCOLAS_SEM_COORDENADA = 4
const PRIMEIRO_INEP = 23000000

export function inepDaEscola(indice: number): string {
  return String(PRIMEIRO_INEP + indice)
}

export function escolaCsv(
  indice: number,
  parcial: Partial<LinhaEscolaCsv> = {}
): LinhaEscolaCsv {
  return {
    codigoInep: inepDaEscola(indice),
    nome: `ESCOLA ${indice}`,
    endereco: `RUA ${indice}, S/N`,
    dependencia: indice % 2 === 0 ? "Municipal" : "Privada",
    localizacao: indice % 3 === 0 ? "Rural" : "Urbana",
    situacaoAtendimento:
      "ESCOLA EM FUNCIONAMENTO E SEM RESTRIÇÃO DE ATENDIMENTO",
    coordenadasValidas: true,
    ...parcial,
  }
}

export function escolaGpkg(
  indice: number,
  [x, y]: Posicao
): RegistroEscolaGpkg {
  return { cod_inep: inepDaEscola(indice), geom: blobGpkg(wkbPonto([x, y])) }
}

/** Centro do bairro `uv` na grade de `insumosValidos`. */
export function centroDoBairro(uv: number): Posicao {
  const coluna = (uv - 1) % 6
  const linha = Math.floor((uv - 1) / 6)
  return [
    ORIGEM_X + coluna * LADO_BAIRRO + LADO_BAIRRO / 2,
    ORIGEM_Y + linha * LADO_BAIRRO + LADO_BAIRRO / 2,
  ]
}

/** Espelha a base real: 24 dentro de bairros, 33 fora da cobertura, 1 fora do limite e 4 sem coordenada. */
function escolasDaBase() {
  const posicoes: Posicao[] = [
    ...Array.from({ length: ESCOLAS_DENTRO }, (_, i) => centroDoBairro(i + 1)),
    // Dentro do limite, ao norte da grade de bairros.
    ...Array.from({ length: ESCOLAS_FORA_DA_COBERTURA }, (_, i): Posicao => [
      ORIGEM_X + 100 + i * 150,
      ORIGEM_Y + 5 * LADO_BAIRRO,
    ]),
    [ORIGEM_X - 20 * LADO_BAIRRO, ORIGEM_Y],
  ]
  const escolasGpkg = posicoes.map((posicao, i) => escolaGpkg(i + 1, posicao))
  const comPonto = posicoes.map((_, i) => escolaCsv(i + 1))
  const semPonto = Array.from({ length: ESCOLAS_SEM_COORDENADA }, (_, i) =>
    escolaCsv(posicoes.length + i + 1, { coordenadasValidas: false })
  )
  return { escolasGpkg, escolasCsv: [...comPonto, ...semPonto] }
}

/** Insumos mínimos e válidos: 24 quadrados de 1 km² numa grade 6×4, um limite que os contém e o relatório coerente. */
export function insumosValidos(): InsumosTerritorio {
  const bairros = Array.from({ length: 24 }, (_, i) => bairroNaGrade(i + 1))
  const relatorio: LinhaRelatorioBairro[] = bairros.map((bairro) => ({
    uv: bairro.uv,
    area_calc_m2: LADO_BAIRRO * LADO_BAIRRO,
    area_lei_m2: bairro.uv % 5 === 0 ? null : LADO_BAIRRO * LADO_BAIRRO,
    inicio_pdf: bairro.pg_pdf,
  }))
  const margem = 500
  return {
    bairros,
    limite: [
      {
        Municipio: "Acaraú",
        codigo_ibg: "2300200",
        geom: blobQuadrado(
          ORIGEM_X - margem,
          ORIGEM_Y - margem,
          6 * LADO_BAIRRO + 2 * margem
        ),
      },
    ],
    relatorio,
    ...escolasDaBase(),
    srs: { bairros: 31984, limite: 31984, escolas: 31984 },
    versoes: {
      gpkg: "aaaaaaaaaaaa",
      relatorio: "bbbbbbbbbbbb",
      csvEscolas: "cccccccccccc",
    },
  }
}
