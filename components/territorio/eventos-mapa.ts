import type { Map as MapaMapLibre, MapGeoJSONFeature } from "maplibre-gl"

import {
  CAMADAS_MAPA,
  ehErroDoFundo,
  ESTADO_BAIRRO,
  FONTES_MAPA,
  ICONES_ESCOLA,
  IMAGEM_SEM_DADOS,
} from "@/lib/territorio/estilo-mapa"
import {
  desenharHachuraSemDados,
  desenharIconeEscola,
} from "@/lib/territorio/imagens-mapa"

// Registros de evento do mapa do Território, um por conceito (DV-28). Cada função só liga os ouvintes; quem monta o
// mapa decide o que fazer com o resultado.

export const MARCA_MAPA_INTERATIVO = "territorio:mapa-interativo"

type EstadoDoBairro = Partial<Record<keyof typeof ESTADO_BAIRRO, boolean>>

function propriedadeTexto(
  feature: MapGeoJSONFeature | undefined,
  nome: string
): string | null {
  const valor: unknown = feature?.properties?.[nome]
  return typeof valor === "string" ? valor : null
}

export function marcarEstado(
  mapa: MapaMapLibre,
  idBairro: string | null,
  estado: EstadoDoBairro
) {
  if (idBairro === null) return
  mapa.setFeatureState({ source: FONTES_MAPA.bairros, id: idBairro }, estado)
}

function registrarIconesDeEscola(mapa: MapaMapLibre) {
  for (const icone of Object.values(ICONES_ESCOLA)) {
    mapa.addImage(icone.imagem, desenharIconeEscola(icone))
  }
}

/** A hachura de "sem dados" é imagem do estilo: entra no `style.load`, como os ícones de escola (DEC-T-07). */
export function registrarEventosDoCoropletico(mapa: MapaMapLibre) {
  mapa.on("style.load", () =>
    mapa.addImage(IMAGEM_SEM_DADOS, desenharHachuraSemDados())
  )
}

// Com `error` escutado o MapLibre não loga: o fundo vira aviso (RF-01.10) e o resto, estado de erro.
export function registrarEventosDoFundo(
  mapa: MapaMapLibre,
  ouvintes: { aoFundoIndisponivel: () => void; aoFalhar: () => void }
) {
  mapa.on("error", (evento) => {
    if (ehErroDoFundo(evento)) {
      ouvintes.aoFundoIndisponivel()
      return
    }
    ouvintes.aoFalhar()
  })
}

export function registrarEventosDeBairro(
  mapa: MapaMapLibre,
  ouvintes: { aoSelecionar: (idBairro: string) => void }
) {
  let hoverId: string | null = null

  mapa.on("mousemove", CAMADAS_MAPA.bairrosPreenchimento, (evento) => {
    const id = propriedadeTexto(evento.features?.[0], "id")
    if (id === hoverId) return
    marcarEstado(mapa, hoverId, { hover: false })
    marcarEstado(mapa, id, { hover: true })
    hoverId = id
    mapa.getCanvas().style.cursor = "pointer"
  })
  mapa.on("mouseleave", CAMADAS_MAPA.bairrosPreenchimento, () => {
    marcarEstado(mapa, hoverId, { hover: false })
    hoverId = null
    mapa.getCanvas().style.cursor = ""
  })
  mapa.on("click", CAMADAS_MAPA.bairrosPreenchimento, (evento) => {
    // Marcador de escola sobre o bairro: o clique é da escola, não do bairro.
    const escolasNoPonto = mapa.queryRenderedFeatures(evento.point, {
      layers: [CAMADAS_MAPA.escolas],
    })
    if (escolasNoPonto.length > 0) return
    const id = propriedadeTexto(evento.features?.[0], "id")
    if (id !== null) ouvintes.aoSelecionar(id)
  })
}

export function registrarEventosDeEscola(
  mapa: MapaMapLibre,
  ouvintes: { aoAbrir: (codigoInep: string) => void }
) {
  mapa.on("style.load", () => registrarIconesDeEscola(mapa))
  mapa.on("click", CAMADAS_MAPA.escolas, (evento) => {
    const codigo = propriedadeTexto(evento.features?.[0], "codigoInep")
    if (codigo !== null) ouvintes.aoAbrir(codigo)
  })
  mapa.on("mouseenter", CAMADAS_MAPA.escolas, () => {
    mapa.getCanvas().style.cursor = "pointer"
  })
  mapa.on("mouseleave", CAMADAS_MAPA.escolas, () => {
    mapa.getCanvas().style.cursor = ""
  })
}

// O primeiro `load` é o estilo pronto (`map.loaded()` volta a ser falso a cada tile em download).
export function aoCarregarMapa(
  mapa: MapaMapLibre,
  recipiente: HTMLElement,
  aoPronto: () => void
) {
  mapa.on("load", () => {
    performance.mark(MARCA_MAPA_INTERATIVO)
    aoPronto()
    // Gancho dos testes E2E: o clique no mapa precisa do pixel de um ponto geográfico (TechSpec EP-01 §11).
    recipiente.dataset.mapaPronto = "true"
    Object.assign(recipiente, { mapa })
  })
}
