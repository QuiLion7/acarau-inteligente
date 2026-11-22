// Montagem dos dados do mapa: enquadramento e GeoJSON dos bairros e das escolas (TechSpec EP-03 §2, DV-33).
import type { Bairro, Escola } from "@/lib/territorio/artefato-schema"
import type { DadosCoropletico } from "@/lib/territorio/estilo-mapa"

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
