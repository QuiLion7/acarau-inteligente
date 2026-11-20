// Reprojeção EPSG:31984 (SIRGAS 2000 / UTM 24S, metros) → EPSG:4326 (graus), só para exibição.
import proj4 from "proj4"
import type { MultiPoligono, Posicao } from "./geometria"

const SIRGAS_2000_UTM_24S =
  "+proj=utm +zone=24 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
const CASAS_DECIMAIS = 6 // 1e-6 grau ≈ 0,1 m
const FATOR_ARREDONDAMENTO = 10 ** CASAS_DECIMAIS

proj4.defs("EPSG:31984", SIRGAS_2000_UTM_24S)

export function arredondarCoordenada(valor: number): number {
  return Math.round(valor * FATOR_ARREDONDAMENTO) / FATOR_ARREDONDAMENTO
}

/** `[x, y]` em metros → `[lon, lat]` em graus, com 6 casas. */
export function projetarPosicao(posicao: Posicao): Posicao {
  const [lon, lat] = proj4("EPSG:31984", "EPSG:4326", posicao)
  return [arredondarCoordenada(lon), arredondarCoordenada(lat)]
}

export function projetarMultiPoligono(
  multiPoligono: MultiPoligono
): MultiPoligono {
  return multiPoligono.map((poligono) =>
    poligono.map((anel) => anel.map(projetarPosicao))
  )
}
