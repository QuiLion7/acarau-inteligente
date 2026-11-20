"use client"

import "maplibre-gl/dist/maplibre-gl.css"

import {
  GPUInitializationError,
  Map as MapaMapLibre,
  setWorkerUrl,
  type MapGeoJSONFeature,
} from "maplibre-gl"
import { useEffect, useEffectEvent, useRef, useState } from "react"

import { EstadoInterface } from "@/components/estados/estado-interface"
import { AvisoMapaBase } from "@/components/territorio/aviso-mapa-base"
import { Button } from "@/components/ui/button"
import type {
  Bairro,
  Escola,
  LimiteMunicipal,
} from "@/lib/territorio/artefato-schema"
import {
  calcularEnquadramento,
  CAMADAS_MAPA,
  desenharIconeEscola,
  ehErroDoFundo,
  ESTADO_BAIRRO,
  FONTES_MAPA,
  ICONES_ESCOLA,
  montarEstilo,
  visibilidadePorCamadaDoEstilo,
  type IdCamadaControlavel,
} from "@/lib/territorio/estilo-mapa"

// Turbopack só emite o worker do MapLibre como asset se a URL vier de `new URL(..., import.meta.url)` (docs do
// MapLibre, "Installation > Turbopack"); sem isto o worker não carrega e o mapa fica em branco.
setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString()
)

const MARCA_MAPA_INTERATIVO = "territorio:mapa-interativo"
const PREENCHIMENTO_ENQUADRAMENTO_PX = 24

// Camadas do mapa resumo do Início: bairros e limite, sem escolas nem controle (TechSpec EP-01 §2).
const CAMADAS_DO_RESUMO: ReadonlySet<IdCamadaControlavel> = new Set([
  "bairros",
  "limite-municipal",
])

const CLASSE_ALTURA = {
  completo: "h-96 lg:h-[32rem]",
  resumo: "h-72 lg:h-96",
} as const

type MapaTerritorioProps = {
  /** `completo` é o explorador; `resumo` é o mapa do Início, só para navegar até o bairro. */
  modo?: "completo" | "resumo"
  bairros: Bairro[]
  limite: LimiteMunicipal
  onSelecionar: (idBairro: string) => void
  // Só no modo completo: o resumo não tem escolas, destaque nem controle de camadas.
  escolas?: Escola[]
  selecionadoId?: string | null
  camadasLigadas?: ReadonlySet<IdCamadaControlavel>
  onAbrirEscola?: (codigoInep: string) => void
}

function propriedadeTexto(
  feature: MapGeoJSONFeature | undefined,
  nome: string
): string | null {
  const valor: unknown = feature?.properties?.[nome]
  return typeof valor === "string" ? valor : null
}

function registrarIconesDeEscola(mapa: MapaMapLibre) {
  for (const icone of Object.values(ICONES_ESCOLA)) {
    mapa.addImage(icone.imagem, desenharIconeEscola(icone))
  }
}

function marcarEstado(
  mapa: MapaMapLibre,
  idBairro: string | null,
  estado: Partial<Record<keyof typeof ESTADO_BAIRRO, boolean>>
) {
  if (idBairro === null) return
  mapa.setFeatureState({ source: FONTES_MAPA.bairros, id: idBairro }, estado)
}

// Mapa MapLibre sem wrapper (DV-20). O efeito sincroniza o React com um sistema externo (o canvas WebGL): cria o
// mapa, liga os eventos e remove tudo ao desmontar. Selecionado e camadas ligadas vêm de fora e são reaplicados.
export function MapaTerritorio({
  modo = "completo",
  bairros,
  limite,
  onSelecionar,
  escolas,
  selecionadoId = null,
  camadasLigadas = CAMADAS_DO_RESUMO,
  onAbrirEscola,
}: MapaTerritorioProps) {
  const recipienteRef = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<MapaMapLibre | null>(null)
  // `map.loaded()` volta a ser falso a cada tile em download; o que vale aqui é o primeiro `load` (estilo pronto).
  const prontoRef = useRef(false)
  const selecionadoAplicadoRef = useRef<string | null>(null)
  const [teveErro, setTeveErro] = useState(false)
  const [fundoIndisponivel, setFundoIndisponivel] = useState(false)

  const aplicarCamadas = useEffectEvent((mapa: MapaMapLibre) => {
    for (const [camada, visibilidade] of visibilidadePorCamadaDoEstilo(
      camadasLigadas
    )) {
      // Estilo sem escolas não tem a camada delas; `setLayoutProperty` numa camada ausente viraria erro do mapa.
      if (mapa.getLayer(camada)) {
        mapa.setLayoutProperty(camada, "visibility", visibilidade)
      }
    }
  })
  const aplicarSelecao = useEffectEvent((mapa: MapaMapLibre) => {
    marcarEstado(mapa, selecionadoAplicadoRef.current, {
      selecionado: false,
    })
    marcarEstado(mapa, selecionadoId, { selecionado: true })
    selecionadoAplicadoRef.current = selecionadoId
  })
  const selecionar = useEffectEvent(onSelecionar)
  const abrirEscola = useEffectEvent((codigoInep: string) =>
    onAbrirEscola?.(codigoInep)
  )
  // Os dados são fixos na vida da tela, mas cada `router.replace` traz objetos novos do servidor: ler pelo Effect
  // Event evita recriar o mapa (e perder o enquadramento) a cada seleção.
  const dadosDoMapa = useEffectEvent(() => ({ bairros, limite, escolas }))

  useEffect(() => {
    const recipiente = recipienteRef.current
    if (teveErro || !recipiente) return

    const dados = dadosDoMapa()
    let mapa: MapaMapLibre
    try {
      mapa = new MapaMapLibre({
        container: recipiente,
        style: montarEstilo(dados),
        bounds: calcularEnquadramento(dados.bairros),
        fitBoundsOptions: { padding: PREENCHIMENTO_ENQUADRAMENTO_PX },
        // No Início a roda do mouse rola a página; o zoom fica nos botões e no gesto de pinça.
        scrollZoom: modo !== "resumo",
      })
    } catch (erro) {
      // WebGL indisponível (RN-023): o mapa vira estado de erro e o resto da tela segue funcionando.
      if (!(erro instanceof GPUInitializationError)) throw erro
      // Adiado de propósito: a criação falha de forma síncrona e o estado só muda depois do efeito.
      queueMicrotask(() => setTeveErro(true))
      return
    }
    mapaRef.current = mapa
    let hoverId: string | null = null

    // Com `error` escutado o MapLibre não loga: o fundo vira aviso (RF-01.10) e o resto, estado de erro.
    mapa.on("error", (evento) => {
      if (ehErroDoFundo(evento)) {
        setFundoIndisponivel(true)
        return
      }
      setTeveErro(true)
    })
    mapa.on("style.load", () => registrarIconesDeEscola(mapa))
    mapa.on("load", () => {
      prontoRef.current = true
      performance.mark(MARCA_MAPA_INTERATIVO)
      aplicarCamadas(mapa)
      aplicarSelecao(mapa)
      // Gancho dos testes E2E: o clique no mapa precisa do pixel de um ponto geográfico (TechSpec §11).
      recipiente.dataset.mapaPronto = "true"
      Object.assign(recipiente, { mapa })
    })
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
      if (
        mapa.queryRenderedFeatures(evento.point, {
          layers: [CAMADAS_MAPA.escolas],
        }).length > 0
      )
        return
      const id = propriedadeTexto(evento.features?.[0], "id")
      if (id !== null) selecionar(id)
    })
    mapa.on("click", CAMADAS_MAPA.escolas, (evento) => {
      const codigo = propriedadeTexto(evento.features?.[0], "codigoInep")
      if (codigo !== null) abrirEscola(codigo)
    })
    mapa.on("mouseenter", CAMADAS_MAPA.escolas, () => {
      mapa.getCanvas().style.cursor = "pointer"
    })
    mapa.on("mouseleave", CAMADAS_MAPA.escolas, () => {
      mapa.getCanvas().style.cursor = ""
    })

    return () => {
      delete recipiente.dataset.mapaPronto
      Reflect.deleteProperty(recipiente, "mapa")
      mapa.remove()
      mapaRef.current = null
      prontoRef.current = false
      selecionadoAplicadoRef.current = null
    }
  }, [teveErro, modo])

  useEffect(() => {
    const mapa = mapaRef.current
    if (mapa && prontoRef.current) aplicarSelecao(mapa)
  }, [selecionadoId])

  useEffect(() => {
    const mapa = mapaRef.current
    if (mapa && prontoRef.current) aplicarCamadas(mapa)
  }, [camadasLigadas])

  if (teveErro) {
    return (
      <EstadoInterface
        tipo="erro"
        titulo="Não foi possível mostrar o mapa"
        descricao="A lista, a ficha e as tabelas continuam funcionando. Tente carregar o mapa de novo."
        acao={
          <Button
            variant="outline"
            onClick={() => {
              setFundoIndisponivel(false)
              setTeveErro(false)
            }}
          >
            Tentar novamente
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {fundoIndisponivel ? <AvisoMapaBase /> : null}
      <div
        ref={recipienteRef}
        role="region"
        aria-label={
          modo === "resumo"
            ? "Mapa resumido dos bairros de Acaraú"
            : "Mapa dos bairros de Acaraú"
        }
        className={`${CLASSE_ALTURA[modo]} w-full overflow-hidden rounded-lg border`}
      />
    </div>
  )
}
