// Estilo do mapa do Território (TechSpec EP-01 §2, §6; DV-20): montado no app, com a camada `background` neutra
// por baixo do raster do OpenStreetMap. Se o fundo falhar, o neutro e as camadas da demonstração seguem visíveis.
// Só tipos do MapLibre aqui: o módulo não carrega a biblioteca e roda nos testes de unidade.
import type { LayerSpecification, StyleSpecification } from "maplibre-gl"

import { MAPA_BASE } from "@/lib/config/mapa-base"
import type {
  Bairro,
  Escola,
  EstadoEscola,
  LimiteMunicipal,
} from "@/lib/territorio/artefato-schema"

export const FONTES_MAPA = {
  fundo: "mapa-base",
  limite: "limite-municipal",
  bairros: "bairros",
  escolas: "escolas",
} as const

export const CAMADAS_MAPA = {
  fundoNeutro: "fundo-neutro",
  fundoOsm: "mapa-base",
  limite: "limite-linha",
  bairrosPreenchimento: "bairros-preenchimento",
  bairrosLinha: "bairros-linha",
  bairrosSelecao: "bairros-selecao",
  escolas: "escolas-marcadores",
} as const

/** Estados de `feature-state` dos bairros. */
export const ESTADO_BAIRRO = {
  hover: "hover",
  selecionado: "selecionado",
} as const

// Cores em hexadecimal porque o MapLibre não lê variáveis CSS; a legenda usa as mesmas constantes.
export const CORES_MAPA = {
  fundoNeutro: "#eceff1",
  bairro: "#2f6fb0",
  bairroSelecionado: "#0b2540",
  limite: "#4a4a4a",
  escolaDentroDeBairro: "#c2410c",
  escolaForaDaCobertura: "#6d28d9",
  escolaForaDoLimite: "#b91c1c",
} as const

const OPACIDADE_BAIRRO = {
  normal: 0.15,
  hover: 0.35,
  selecionado: 0.5,
} as const
const LARGURA_LINHA_BAIRRO = 1.5
const LARGURA_LINHA_SELECAO = 4
const LARGURA_LINHA_LIMITE = 2
const TRACEJADO_LIMITE = [3, 2]

export type IdCamadaControlavel = "bairros" | "limite-municipal" | "escolas"

export type CamadaControlavel = {
  id: IdCamadaControlavel
  rotulo: string
  /** As escolas começam desligadas: o visitante as liga quando quer vê-las (jornada do E2E-01). */
  ligadaDeInicio: boolean
  /** Camadas do estilo que o controle liga e desliga juntas. */
  camadasDoEstilo: readonly string[]
}

/** O que o controle de camadas pode oferecer; cada `id` é o de `camadas.json` (RN-005). */
export const CAMADAS_CONTROLAVEIS: readonly CamadaControlavel[] = [
  {
    id: "bairros",
    rotulo: "Bairros",
    ligadaDeInicio: true,
    camadasDoEstilo: [
      CAMADAS_MAPA.bairrosPreenchimento,
      CAMADAS_MAPA.bairrosLinha,
      CAMADAS_MAPA.bairrosSelecao,
    ],
  },
  {
    id: "limite-municipal",
    rotulo: "Limite municipal",
    ligadaDeInicio: true,
    camadasDoEstilo: [CAMADAS_MAPA.limite],
  },
  {
    id: "escolas",
    rotulo: "Escolas",
    ligadaDeInicio: false,
    camadasDoEstilo: [CAMADAS_MAPA.escolas],
  },
]

export type EstadoComMarcador = Exclude<EstadoEscola, "sem-localizacao">
type FormaDoIcone = "circulo" | "quadrado" | "triangulo"

export type IconeEscola = {
  /** Nome da imagem registrada no mapa. */
  imagem: string
  forma: FormaDoIcone
  cor: string
  rotulo: string
}

export const ESTADOS_COM_MARCADOR: readonly EstadoComMarcador[] = [
  "dentro-de-bairro",
  "fora-da-cobertura",
  "fora-do-limite",
]

/** Um ícone por estado: forma e cor diferentes, para o significado não depender só da cor (DV-20, CA-01.07). */
export const ICONES_ESCOLA: Record<EstadoComMarcador, IconeEscola> = {
  "dentro-de-bairro": {
    imagem: "escola-dentro-de-bairro",
    forma: "circulo",
    cor: CORES_MAPA.escolaDentroDeBairro,
    rotulo: "Escola dentro de bairro",
  },
  "fora-da-cobertura": {
    imagem: "escola-fora-da-cobertura",
    forma: "quadrado",
    cor: CORES_MAPA.escolaForaDaCobertura,
    rotulo: "Escola fora da cobertura dos bairros",
  },
  "fora-do-limite": {
    imagem: "escola-fora-do-limite",
    forma: "triangulo",
    cor: CORES_MAPA.escolaForaDoLimite,
    rotulo: "Escola fora do limite municipal",
  },
}

const LADO_ICONE_PX = 24
const MEIO_LADO_ICONE = 11
const ESPESSURA_CONTORNO_ICONE = 3

const DENTRO_DA_FORMA: Record<
  FormaDoIcone,
  (dx: number, dy: number, meioLado: number) => boolean
> = {
  circulo: (dx, dy, meioLado) => Math.hypot(dx, dy) <= meioLado,
  quadrado: (dx, dy, meioLado) =>
    Math.max(Math.abs(dx), Math.abs(dy)) <= meioLado,
  // Ponta para cima: a meia-largura cresce de 0 no topo até `meioLado` na base.
  triangulo: (dx, dy, meioLado) =>
    dy >= -meioLado && dy <= meioLado && Math.abs(dx) <= (dy + meioLado) / 2,
}

function rgbDeHex(cor: string): [number, number, number] {
  const valor = Number.parseInt(cor.slice(1), 16)
  return [(valor >> 16) & 255, (valor >> 8) & 255, valor & 255]
}

export type ImagemRgba = { width: number; height: number; data: Uint8Array }

/** Rasteriza o ícone (forma preenchida com contorno branco, fundo transparente), sem depender de canvas. */
export function desenharIconeEscola(icone: IconeEscola): ImagemRgba {
  const dentro = DENTRO_DA_FORMA[icone.forma]
  const [vermelho, verde, azul] = rgbDeHex(icone.cor)
  const centro = (LADO_ICONE_PX - 1) / 2
  const data = new Uint8Array(LADO_ICONE_PX * LADO_ICONE_PX * 4)
  for (let linha = 0; linha < LADO_ICONE_PX; linha++) {
    for (let coluna = 0; coluna < LADO_ICONE_PX; coluna++) {
      const [dx, dy] = [coluna - centro, linha - centro]
      if (!dentro(dx, dy, MEIO_LADO_ICONE)) continue
      const noMiolo = dentro(dx, dy, MEIO_LADO_ICONE - ESPESSURA_CONTORNO_ICONE)
      const pixel = (linha * LADO_ICONE_PX + coluna) * 4
      data.set(
        noMiolo ? [vermelho, verde, azul, 255] : [255, 255, 255, 255],
        pixel
      )
    }
  }
  return { width: LADO_ICONE_PX, height: LADO_ICONE_PX, data }
}

type DadosDoMapa = {
  bairros: readonly Bairro[]
  limite: LimiteMunicipal
  /** Sem escolas (mapa resumo do Início), o estilo não leva a camada nem a fonte delas. */
  escolas?: readonly Escola[]
}

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

function bairrosParaGeoJson(bairros: readonly Bairro[]) {
  return {
    type: "FeatureCollection" as const,
    features: bairros.map(({ id, nome, uv, geometria }) => ({
      type: "Feature" as const,
      properties: { id, nome, uv },
      geometry: geometria,
    })),
  }
}

function emFeatureState(estado: string, comEstado: number, semEstado: number) {
  return [
    "case",
    ["boolean", ["feature-state", estado], false],
    comEstado,
    semEstado,
  ]
}

function escolasParaGeoJson(escolas: readonly Escola[]) {
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

// `match` do estado da escola para o nome da imagem registrada no mapa.
const IMAGEM_POR_ESTADO = [
  "match",
  ["get", "estado"],
  "dentro-de-bairro",
  ICONES_ESCOLA["dentro-de-bairro"].imagem,
  "fora-do-limite",
  ICONES_ESCOLA["fora-do-limite"].imagem,
  ICONES_ESCOLA["fora-da-cobertura"].imagem,
]

const CAMADA_DE_ESCOLAS = {
  id: CAMADAS_MAPA.escolas,
  type: "symbol",
  source: FONTES_MAPA.escolas,
  // Sem `icon-allow-overlap` o MapLibre esconde marcadores que colidem e a contagem na tela deixa de bater.
  layout: { "icon-image": IMAGEM_POR_ESTADO, "icon-allow-overlap": true },
} as LayerSpecification

function camadasDoEstilo(comEscolas: boolean): LayerSpecification[] {
  const camadas = [
    {
      id: CAMADAS_MAPA.fundoNeutro,
      type: "background",
      paint: { "background-color": CORES_MAPA.fundoNeutro },
    },
    { id: CAMADAS_MAPA.fundoOsm, type: "raster", source: FONTES_MAPA.fundo },
    {
      id: CAMADAS_MAPA.limite,
      type: "line",
      source: FONTES_MAPA.limite,
      paint: {
        "line-color": CORES_MAPA.limite,
        "line-width": LARGURA_LINHA_LIMITE,
        "line-dasharray": TRACEJADO_LIMITE,
      },
    },
    {
      id: CAMADAS_MAPA.bairrosPreenchimento,
      type: "fill",
      source: FONTES_MAPA.bairros,
      paint: {
        "fill-color": CORES_MAPA.bairro,
        "fill-opacity": [
          "case",
          ["boolean", ["feature-state", ESTADO_BAIRRO.selecionado], false],
          OPACIDADE_BAIRRO.selecionado,
          ["boolean", ["feature-state", ESTADO_BAIRRO.hover], false],
          OPACIDADE_BAIRRO.hover,
          OPACIDADE_BAIRRO.normal,
        ],
      },
    },
    {
      id: CAMADAS_MAPA.bairrosLinha,
      type: "line",
      source: FONTES_MAPA.bairros,
      paint: {
        "line-color": CORES_MAPA.bairro,
        "line-width": LARGURA_LINHA_BAIRRO,
      },
    },
    {
      // Contorno grosso só no bairro selecionado: o destaque não depende apenas da cor (DV-20).
      id: CAMADAS_MAPA.bairrosSelecao,
      type: "line",
      source: FONTES_MAPA.bairros,
      paint: {
        "line-color": CORES_MAPA.bairroSelecionado,
        "line-width": emFeatureState(
          ESTADO_BAIRRO.selecionado,
          LARGURA_LINHA_SELECAO,
          0
        ),
      },
    },
  ] as LayerSpecification[]
  return comEscolas ? [...camadas, CAMADA_DE_ESCOLAS] : camadas
}

/** Estilo completo: `background`, raster do OSM, limite, bairros e escolas, nesta ordem (de baixo para cima). */
export function montarEstilo({
  bairros,
  limite,
  escolas,
}: DadosDoMapa): StyleSpecification {
  return {
    version: 8,
    sources: {
      [FONTES_MAPA.fundo]: {
        type: "raster",
        tiles: [MAPA_BASE.urlTiles],
        tileSize: MAPA_BASE.tamanhoTile,
        maxzoom: MAPA_BASE.zoomMaximo,
        attribution: MAPA_BASE.atribuicao,
      },
      [FONTES_MAPA.limite]: {
        type: "geojson",
        data: {
          type: "Feature",
          properties: { nome: limite.nome },
          geometry: limite.geometria,
        },
      },
      [FONTES_MAPA.bairros]: {
        type: "geojson",
        data: bairrosParaGeoJson(bairros),
        promoteId: "id",
      },
      ...(escolas && {
        [FONTES_MAPA.escolas]: {
          type: "geojson" as const,
          data: escolasParaGeoJson(escolas),
        },
      }),
    },
    layers: camadasDoEstilo(escolas !== undefined),
  }
}

/** Camada do estilo → visibilidade, a partir de quais camadas controláveis estão ligadas. */
export function visibilidadePorCamadaDoEstilo(
  ligadas: ReadonlySet<IdCamadaControlavel>
): Map<string, "visible" | "none"> {
  return new Map(
    CAMADAS_CONTROLAVEIS.flatMap(({ id, camadasDoEstilo }) =>
      camadasDoEstilo.map(
        (camada) =>
          [camada, ligadas.has(id) ? "visible" : "none"] as [
            string,
            "visible" | "none",
          ]
      )
    )
  )
}

/**
 * O erro vem do fundo OSM (tile bloqueado, fora do ar, timeout)? Esse caso vira aviso, não erro do mapa.
 * O MapLibre acrescenta `sourceId` ao evento em runtime, mas o tipo `ErrorEvent` não o declara.
 */
export function ehErroDoFundo(evento: object): boolean {
  return "sourceId" in evento && evento.sourceId === FONTES_MAPA.fundo
}
