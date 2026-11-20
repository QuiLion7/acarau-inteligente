// Decodifica o blob de geometria do GeoPackage (cabeçalho GP + WKB), só o que a carga usa:
// Point, Polygon e MultiPolygon em 2D. Qualquer outra coisa é erro nomeado, nunca leitura parcial.
import type { MultiPoligono, Poligono, Posicao } from "./geometria"

export class GeometriaNaoSuportadaErro extends Error {
  constructor(motivo: string) {
    super(`Geometria GeoPackage não suportada: ${motivo}.`)
    this.name = "GeometriaNaoSuportadaErro"
  }
}

export type GeometriaDecodificada =
  | { tipo: "Point"; posicao: Posicao }
  | { tipo: "MultiPolygon"; poligonos: MultiPoligono }

const ASSINATURA_GPKG = [0x47, 0x50]
const TAMANHO_ENVELOPE_POR_INDICADOR = [0, 32, 48, 48, 64]
const POSICAO_FLAGS = 3
const TAMANHO_BASE_CABECALHO = 8
const BIT_VAZIO = 0b10000
const BIT_TIPO_ESTENDIDO = 0b100000
const WKB_POINT = 1
const WKB_POLYGON = 3
const WKB_MULTIPOLYGON = 6

function lerCabecalho(blob: Uint8Array): number {
  if (blob.length < TAMANHO_BASE_CABECALHO) {
    throw new GeometriaNaoSuportadaErro("blob menor que o cabeçalho")
  }
  if (blob[0] !== ASSINATURA_GPKG[0] || blob[1] !== ASSINATURA_GPKG[1]) {
    throw new GeometriaNaoSuportadaErro("assinatura GP ausente")
  }
  const flags = blob[POSICAO_FLAGS]
  if (flags & BIT_TIPO_ESTENDIDO) {
    throw new GeometriaNaoSuportadaErro("tipo estendido")
  }
  if (flags & BIT_VAZIO) throw new GeometriaNaoSuportadaErro("geometria vazia")
  const tamanhoEnvelope = TAMANHO_ENVELOPE_POR_INDICADOR[(flags >> 1) & 0b111]
  if (tamanhoEnvelope === undefined) {
    throw new GeometriaNaoSuportadaErro("indicador de envelope inválido")
  }
  return TAMANHO_BASE_CABECALHO + tamanhoEnvelope
}

class LeitorWkb {
  private posicao: number
  private readonly visao: DataView

  constructor(blob: Uint8Array, inicio: number) {
    this.visao = new DataView(blob.buffer, blob.byteOffset, blob.byteLength)
    this.posicao = inicio
  }

  lerOrdemDosBytes(): boolean {
    const ordem = this.visao.getUint8(this.posicao)
    this.posicao += 1
    return ordem === 1
  }

  lerUint32(littleEndian: boolean): number {
    const valor = this.visao.getUint32(this.posicao, littleEndian)
    this.posicao += 4
    return valor
  }

  lerPosicao(littleEndian: boolean): Posicao {
    const x = this.visao.getFloat64(this.posicao, littleEndian)
    const y = this.visao.getFloat64(this.posicao + 8, littleEndian)
    this.posicao += 16
    return [x, y]
  }

  lerCabecalhoDeTipo(): { tipo: number; littleEndian: boolean } {
    const littleEndian = this.lerOrdemDosBytes()
    return { tipo: this.lerUint32(littleEndian), littleEndian }
  }

  lerPoligono(littleEndian: boolean): Poligono {
    const aneis = this.lerUint32(littleEndian)
    return Array.from({ length: aneis }, () => {
      const pontos = this.lerUint32(littleEndian)
      return Array.from({ length: pontos }, () => this.lerPosicao(littleEndian))
    })
  }
}

function lerPoligonoCompleto(leitor: LeitorWkb): Poligono {
  const { tipo, littleEndian } = leitor.lerCabecalhoDeTipo()
  if (tipo !== WKB_POLYGON) {
    throw new GeometriaNaoSuportadaErro(
      `tipo WKB ${tipo} dentro de MultiPolygon`
    )
  }
  return leitor.lerPoligono(littleEndian)
}

function decodificarWkb(leitor: LeitorWkb): GeometriaDecodificada {
  const { tipo, littleEndian } = leitor.lerCabecalhoDeTipo()
  if (tipo === WKB_POINT) {
    return { tipo: "Point", posicao: leitor.lerPosicao(littleEndian) }
  }
  if (tipo === WKB_POLYGON) {
    return {
      tipo: "MultiPolygon",
      poligonos: [leitor.lerPoligono(littleEndian)],
    }
  }
  if (tipo === WKB_MULTIPOLYGON) {
    const quantidade = leitor.lerUint32(littleEndian)
    const poligonos = Array.from({ length: quantidade }, () =>
      lerPoligonoCompleto(leitor)
    )
    return { tipo: "MultiPolygon", poligonos }
  }
  throw new GeometriaNaoSuportadaErro(`tipo WKB ${tipo}`)
}

export function decodificarGeometria(blob: Uint8Array): GeometriaDecodificada {
  const inicioWkb = lerCabecalho(blob)
  try {
    return decodificarWkb(new LeitorWkb(blob, inicioWkb))
  } catch (erro) {
    if (erro instanceof RangeError) {
      throw new GeometriaNaoSuportadaErro("WKB truncado")
    }
    throw erro
  }
}

export function decodificarPonto(blob: Uint8Array): Posicao {
  const geometria = decodificarGeometria(blob)
  if (geometria.tipo !== "Point") {
    throw new GeometriaNaoSuportadaErro("esperado Point")
  }
  return geometria.posicao
}

export function decodificarMultiPoligono(blob: Uint8Array): MultiPoligono {
  const geometria = decodificarGeometria(blob)
  if (geometria.tipo !== "MultiPolygon") {
    throw new GeometriaNaoSuportadaErro("esperado Polygon ou MultiPolygon")
  }
  return geometria.poligonos
}
