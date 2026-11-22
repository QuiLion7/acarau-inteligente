// Montagem dos dados do mapa: enquadramento e GeoJSON dos bairros e das escolas (TechSpec EP-03 §2, DV-33).
import type { Bairro, Escola } from "@/lib/territorio/artefato-schema"
import type { DadosCoropletico } from "@/lib/territorio/estilo-mapa"
import type { SituacaoObra } from "@/lib/obras/situacao-obra"
import type { Obra, PontoObra } from "@/lib/validations/obra-schema"

export type Enquadramento = [
  [oeste: number, sul: number],
  [leste: number, norte: number],
]

/** Retângulo que envolve todos os bairros: é onde o mapa abre (a cobertura é a sede, não o município inteiro). */
export function calcularEnquadramento(
  bairros: readonly Bairro[]
): Enquadramento {
  const [primeiro, ...demais] = bairros
  if (!primeiro) throw new Error("Sem bairros para enquadrar o mapa.")
  const [oeste, sul, leste, norte] = demais.reduce(
    (atual, { bbox }) => [
      Math.min(atual[0], bbox[0]),
      Math.min(atual[1], bbox[1]),
      Math.max(atual[2], bbox[2]),
      Math.max(atual[3], bbox[3]),
    ],
    primeiro.bbox
  )
  return [
    [oeste, sul],
    [leste, norte],
  ]
}

/** Bairros como GeoJSON; no coroplético cada um leva `situacao` e `classe` do período (DEC-T-07). */
export function bairrosParaGeoJson(
  bairros: readonly Bairro[],
  coropletico?: DadosCoropletico
) {
  return {
    type: "FeatureCollection" as const,
    features: bairros.map(({ id, nome, uv, geometria }) => ({
      type: "Feature" as const,
      properties: {
        id,
        nome,
        uv,
        ...(coropletico && {
          situacao: coropletico[id]?.situacao ?? "sem-dados",
          classe: coropletico[id]?.classe ?? null,
        }),
      },
      geometry: geometria,
    })),
  }
}

export function escolasParaGeoJson(escolas: readonly Escola[]) {
  return {
    type: "FeatureCollection" as const,
    features: escolas.flatMap(({ codigoInep, nome, estado, posicao }) =>
      posicao === null
        ? []
        : [
            {
              type: "Feature" as const,
              properties: { codigoInep, nome, estado },
              geometry: { type: "Point" as const, coordinates: posicao },
            },
          ]
    ),
  }
}

/** O que o mapa sabe de uma obra: só as com ponto, sem o resto do cadastro (react-next.md §2). */
export type ObraNoMapa = {
  id: string
  titulo: string
  situacao: SituacaoObra
  longitude: number
  latitude: number
}

/** Obra sem ponto não vai ao mapa e nunca ganha marcador (RN-04.02): é a única que fica de fora desta lista. */
export function obrasNoMapa(obras: readonly Obra[]): ObraNoMapa[] {
  return obras.flatMap(({ id, titulo, situacao, localizacao }) =>
    localizacao ? [{ id, titulo, situacao, ...localizacao }] : []
  )
}

/** Um ponto por obra da lista; o título vai como propriedade de texto, nunca como HTML (RNF-04.04). */
export function obrasParaGeoJson(obras: readonly ObraNoMapa[]) {
  return {
    type: "FeatureCollection" as const,
    features: obras.map(({ id, titulo, situacao, longitude, latitude }) => ({
      type: "Feature" as const,
      properties: { id, titulo, situacao },
      geometry: {
        type: "Point" as const,
        coordinates: [longitude, latitude],
      },
    })),
  }
}

/** O ponto escolhido no formulário (RF-04.16): nenhuma feature quando ainda não há ponto. */
export function pontoProvisorioParaGeoJson(ponto: PontoObra | null) {
  return {
    type: "FeatureCollection" as const,
    features: ponto
      ? [
          {
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "Point" as const,
              coordinates: [ponto.longitude, ponto.latitude],
            },
          },
        ]
      : [],
  }
}

/** Marcadores desenhados por situação, para a legenda: só conta quem está na lista do mapa (tem ponto). */
export function contarMarcadoresDeObras(
  obras: readonly Pick<ObraNoMapa, "situacao">[]
): Record<SituacaoObra, number> {
  const contagem: Record<SituacaoObra, number> = {
    planejada: 0,
    em_andamento: 0,
    concluida: 0,
    suspensa: 0,
  }
  for (const { situacao } of obras) contagem[situacao] += 1
  return contagem
}
