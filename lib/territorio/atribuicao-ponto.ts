// Estado de cobertura de cada escola e regra de fronteira (TechSpec EP-01 §4.4, RN-008). Puro, em EPSG:31984.
import { localizarPonto, type MultiPoligono, type Posicao } from "./geometria"

export type BairroGeometrico = { uv: number; geometria: MultiPoligono }

export type AtribuicaoEscola =
  | { estado: "sem-localizacao" }
  | { estado: "fora-do-limite" }
  | { estado: "fora-da-cobertura" }
  | {
      estado: "dentro-de-bairro"
      uvAtribuida: number
      /** Todas as UVs em que o ponto está dentro ou na fronteira, em ordem crescente. */
      uvsTocadas: number[]
      /** Verdadeiro se o ponto tocou fronteira ou mais de um bairro (vira `casosFronteira`). */
      tocouFronteira: boolean
    }

/**
 * Ordem da regra: sem posição → fora do limite → bairro de menor UV entre os que contêm
 * ou tocam o ponto → fora da cobertura. Cada escola recebe um único estado.
 */
export function atribuirEscola(
  posicao: Posicao | null,
  limite: MultiPoligono,
  bairros: readonly BairroGeometrico[]
): AtribuicaoEscola {
  if (!posicao) return { estado: "sem-localizacao" }
  if (localizarPonto(posicao, limite) === "fora") {
    return { estado: "fora-do-limite" }
  }
  const tocados = bairros
    .map(({ uv, geometria }) => ({
      uv,
      local: localizarPonto(posicao, geometria),
    }))
    .filter(({ local }) => local !== "fora")
    .toSorted((a, b) => a.uv - b.uv)
  if (tocados.length === 0) return { estado: "fora-da-cobertura" }
  return {
    estado: "dentro-de-bairro",
    uvAtribuida: tocados[0].uv,
    uvsTocadas: tocados.map(({ uv }) => uv),
    tocouFronteira:
      tocados.length > 1 || tocados.some(({ local }) => local === "fronteira"),
  }
}
