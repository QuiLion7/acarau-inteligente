"use client"

import "maplibre-gl/dist/maplibre-gl.css"

import {
  type GeoJSONSource,
  GPUInitializationError,
  Map as MapaMapLibre,
  setWorkerUrl,
} from "maplibre-gl"
import { useEffect, useEffectEvent, useRef, useState } from "react"

import { EstadoInterface } from "@/components/estados/estado-interface"
import { AvisoMapaBase } from "@/components/territorio/aviso-mapa-base"
import {
  aoCarregarMapa,
  marcarEstado,
  registrarCliqueLivre,
  registrarEventosDeBairro,
  registrarEventosDeEscola,
  registrarEventosDeObra,
  registrarEventosDoCoropletico,
  registrarEventosDoFundo,
} from "@/components/territorio/eventos-mapa"
import { Button } from "@/components/ui/button"
import type {
  Bairro,
  Escola,
  LimiteMunicipal,
} from "@/lib/territorio/artefato-schema"
import {
  CAMADAS_MAPA,
  type DadosCoropletico,
  type DadosDoMapa,
  filtroDaObraSelecionada,
  FONTES_MAPA,
  type IdCamadaControlavel,
  montarEstilo,
  visibilidadePorCamadaDoEstilo,
} from "@/lib/territorio/estilo-mapa"
import {
  bairrosParaGeoJson,
  calcularEnquadramento,
  type ObraNoMapa,
  obrasParaGeoJson,
  pontoProvisorioParaGeoJson,
} from "@/lib/territorio/geojson-mapa"
import type { PontoObra } from "@/lib/validations/obra-schema"

// Turbopack só emite o worker do MapLibre como asset se a URL vier de `new URL(..., import.meta.url)` (docs do
// MapLibre, "Installation > Turbopack"); sem isto o worker não carrega e o mapa fica em branco.
setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString()
)

const PREENCHIMENTO_ENQUADRAMENTO_PX = 24

// Camadas do mapa resumo do Início: bairros e limite, sem escolas nem controle (TechSpec EP-01 §2).
const CAMADAS_DO_RESUMO: ReadonlySet<IdCamadaControlavel> = new Set([
  "bairros",
  "limite-municipal",
])

const ROTULO_DO_MODO = {
  completo: "Mapa dos bairros de Acaraú",
  resumo: "Mapa resumido dos bairros de Acaraú",
} as const

const CLASSE_ALTURA = {
  completo: "h-96 lg:h-[32rem]",
  resumo: "h-72 lg:h-96",
} as const

type Modo = keyof typeof ROTULO_DO_MODO

/** Cria o mapa MapLibre; devolve `null` sem WebGL (RN-023), para o chamador mostrar o estado de erro. */
function criarMapa(
  recipiente: HTMLElement,
  dados: DadosDoMapa,
  modo: Modo
): MapaMapLibre | null {
  try {
    return new MapaMapLibre({
      container: recipiente,
      style: montarEstilo(dados),
      bounds: calcularEnquadramento(dados.bairros),
      fitBoundsOptions: { padding: PREENCHIMENTO_ENQUADRAMENTO_PX },
      // No Início a roda do mouse rola a página; o zoom fica nos botões e no gesto de pinça.
      scrollZoom: modo !== "resumo",
    })
  } catch (erro) {
    if (!(erro instanceof GPUInitializationError)) throw erro
    return null
  }
}

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
  /**
   * Coroplético da Saúde (RF-02.31): situação e classe por bairro no período. Presente desde a montagem, o mapa leva as
   * camadas das classes e cada troca de valor só atualiza os dados (`setData`), sem recriar o mapa. Ausente, o mapa é
   * exatamente o do Território.
   */
  coropletico?: DadosCoropletico
  /**
   * Obras com ponto (EP-04). Presente desde a montagem, o mapa leva as fontes e as camadas de obra e cada troca só
   * atualiza os dados (`setData`/`setFilter`), sem recriar o mapa; passe uma referência estável. Ausente, o mapa é
   * exatamente o dos outros módulos (PA-04.07).
   */
  obras?: ObraNoMapa[]
  obraSelecionadaId?: string | null
  onAbrirObra?: (obraId: string) => void
  /** Ponto escolhido no formulário de obra, desenhado como marcador provisório. */
  pontoProvisorio?: PontoObra | null
  /**
   * Definido = modo "escolher ponto": o clique no mapa devolve a coordenada, e o clique em bairro e em obra deixa de
   * agir (RF-04.16). Indefinido = o clique em bairro e em obra funciona e o clique livre não faz nada.
   */
  onEscolherPonto?: (ponto: PontoObra) => void
  /** Nome acessível da região do mapa, quando o padrão do modo não descreve o uso. */
  rotulo?: string
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
  coropletico,
  obras,
  obraSelecionadaId = null,
  onAbrirObra,
  pontoProvisorio = null,
  onEscolherPonto,
  rotulo,
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
  const escolhendoPonto = useEffectEvent(() => onEscolherPonto !== undefined)
  // No modo "escolher ponto" o clique em bairro e em obra não age: o clique é só do ponto.
  const selecionar = useEffectEvent((idBairro: string) => {
    if (!escolhendoPonto()) onSelecionar(idBairro)
  })
  const abrirEscola = useEffectEvent((codigoInep: string) =>
    onAbrirEscola?.(codigoInep)
  )
  const abrirObra = useEffectEvent((obraId: string) => {
    if (!escolhendoPonto()) onAbrirObra?.(obraId)
  })
  const escolherPonto = useEffectEvent((ponto: PontoObra) =>
    onEscolherPonto?.(ponto)
  )
  // Os dados são fixos na vida da tela, mas cada `router.replace` traz objetos novos do servidor: ler pelo Effect
  // Event evita recriar o mapa (e perder o enquadramento) a cada seleção.
  const dadosDoMapa = useEffectEvent(() => ({
    bairros,
    limite,
    escolas,
    coropletico,
    obras,
    obraSelecionadaId,
    pontoProvisorio,
  }))
  const aplicarCoropletico = useEffectEvent(async (mapa: MapaMapLibre) => {
    const fonte = mapa.getSource<GeoJSONSource>(FONTES_MAPA.bairros)
    if (!coropletico || !fonte) return
    await fonte.setData(bairrosParaGeoJson(dadosDoMapa().bairros, coropletico))
    // O destaque do bairro selecionado é estado do mapa: reaplicado depois de os dados serem trocados.
    aplicarSelecao(mapa)
  })

  const aplicarObras = useEffectEvent(async (mapa: MapaMapLibre) => {
    const fonte = mapa.getSource<GeoJSONSource>(FONTES_MAPA.obras)
    if (!obras || !fonte) return
    await fonte.setData(obrasParaGeoJson(obras))
  })
  const aplicarObraSelecionada = useEffectEvent((mapa: MapaMapLibre) => {
    if (!mapa.getLayer(CAMADAS_MAPA.obrasSelecionada)) return
    mapa.setFilter(
      CAMADAS_MAPA.obrasSelecionada,
      filtroDaObraSelecionada(obraSelecionadaId)
    )
  })
  const aplicarPontoProvisorio = useEffectEvent(async (mapa: MapaMapLibre) => {
    const fonte = mapa.getSource<GeoJSONSource>(FONTES_MAPA.obraProvisoria)
    if (!fonte) return
    await fonte.setData(pontoProvisorioParaGeoJson(pontoProvisorio))
  })

  useEffect(() => {
    const recipiente = recipienteRef.current
    if (teveErro || !recipiente) return

    const dados = dadosDoMapa()
    const mapa = criarMapa(recipiente, dados, modo)
    if (!mapa) {
      // Adiado de propósito: a criação falha de forma síncrona e o estado só muda depois do efeito.
      queueMicrotask(() => setTeveErro(true))
      return
    }
    mapaRef.current = mapa

    registrarEventosDoFundo(mapa, {
      aoFundoIndisponivel: () => setFundoIndisponivel(true),
      aoFalhar: () => setTeveErro(true),
    })
    registrarEventosDeBairro(mapa, {
      aoSelecionar: (idBairro) => selecionar(idBairro),
    })
    registrarEventosDeEscola(mapa, {
      aoAbrir: (codigoInep) => abrirEscola(codigoInep),
    })
    if (dados.coropletico) registrarEventosDoCoropletico(mapa)
    if (dados.obras) {
      registrarEventosDeObra(mapa, { aoAbrir: (obraId) => abrirObra(obraId) })
      registrarCliqueLivre(mapa, {
        aoEscolher: (ponto) => escolherPonto(ponto),
      })
    }
    aoCarregarMapa(mapa, recipiente, () => {
      prontoRef.current = true
      aplicarCamadas(mapa)
      aplicarSelecao(mapa)
      // Os dados do estilo são os da montagem: se o período mudou antes do `load`, a troca é aplicada agora.
      void aplicarCoropletico(mapa)
      // Idem para as obras: o que mudou entre a montagem e o `load` entra agora.
      void aplicarObras(mapa)
      aplicarObraSelecionada(mapa)
      void aplicarPontoProvisorio(mapa)
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

  useEffect(() => {
    const mapa = mapaRef.current
    if (mapa && prontoRef.current) void aplicarCoropletico(mapa)
  }, [coropletico])

  useEffect(() => {
    const mapa = mapaRef.current
    if (mapa && prontoRef.current) void aplicarObras(mapa)
  }, [obras])

  useEffect(() => {
    const mapa = mapaRef.current
    if (mapa && prontoRef.current) aplicarObraSelecionada(mapa)
  }, [obraSelecionadaId])

  useEffect(() => {
    const mapa = mapaRef.current
    if (mapa && prontoRef.current) void aplicarPontoProvisorio(mapa)
  }, [pontoProvisorio])

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
        aria-label={rotulo ?? ROTULO_DO_MODO[modo]}
        className={`${CLASSE_ALTURA[modo]} w-full overflow-hidden rounded-lg border`}
      />
    </div>
  )
}
