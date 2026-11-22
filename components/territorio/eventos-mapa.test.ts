/**
 * @jest-environment jsdom
 */
import type { Map as MapaMapLibre } from "maplibre-gl"

import {
  aoCarregarMapa,
  MARCA_MAPA_INTERATIVO,
  registrarCliqueLivre,
  registrarEventosDeBairro,
  registrarEventosDeEscola,
  registrarEventosDeObra,
  registrarEventosDoCoropletico,
  registrarEventosDoFundo,
} from "@/components/territorio/eventos-mapa"
import {
  CAMADAS_MAPA,
  FONTES_MAPA,
  ICONES_OBRA,
} from "@/lib/territorio/estilo-mapa"

type Ouvinte = (evento: unknown) => void

// O MapLibre não roda em jsdom (TechSpec EP-01 §8): o double guarda os ouvintes e deixa o teste dispará-los.
function criarMapaDouble() {
  const ouvintes = new Map<string, Ouvinte>()
  const canvas = { style: { cursor: "" } }
  const setFeatureState = jest.fn()
  const queryRenderedFeatures = jest.fn(() => [])
  // Por padrão o estilo tem as camadas de escola e de obra; o teste troca quando quer um estilo sem elas.
  const getLayer = jest.fn((): object | undefined => ({}))
  const addImage = jest.fn()
  const chave = (evento: string, camada?: string) =>
    camada ? `${evento}:${camada}` : evento

  const mapa = {
    on: (
      evento: string,
      camadaOuOuvinte: string | Ouvinte,
      ouvinte?: Ouvinte
    ) =>
      typeof camadaOuOuvinte === "string"
        ? ouvintes.set(chave(evento, camadaOuOuvinte), ouvinte as Ouvinte)
        : ouvintes.set(chave(evento), camadaOuOuvinte),
    getCanvas: () => canvas,
    setFeatureState,
    queryRenderedFeatures,
    getLayer,
    addImage,
  }

  return {
    // O código sob teste só usa estes métodos de `Map`; o cast fica restrito ao double.
    mapa: mapa as unknown as MapaMapLibre,
    canvas,
    setFeatureState,
    queryRenderedFeatures,
    getLayer,
    addImage,
    disparar: (evento: string, dados?: unknown, camada?: string) => {
      const ouvinte = ouvintes.get(chave(evento, camada))
      if (!ouvinte) throw new Error(`sem ouvinte para ${chave(evento, camada)}`)
      ouvinte(dados)
    },
  }
}

const noBairro = (id: string) => ({
  features: [{ properties: { id } }],
  point: { x: 1, y: 2 },
})

describe("registrarEventosDoFundo", () => {
  it("erro da fonte do fundo vira aviso e não derruba o mapa", () => {
    const { mapa, disparar } = criarMapaDouble()
    const aoFundoIndisponivel = jest.fn()
    const aoFalhar = jest.fn()
    registrarEventosDoFundo(mapa, { aoFundoIndisponivel, aoFalhar })

    disparar("error", { sourceId: FONTES_MAPA.fundo })

    expect(aoFundoIndisponivel).toHaveBeenCalledTimes(1)
    expect(aoFalhar).not.toHaveBeenCalled()
  })

  it("erro de outra fonte vira falha do mapa", () => {
    const { mapa, disparar } = criarMapaDouble()
    const aoFundoIndisponivel = jest.fn()
    const aoFalhar = jest.fn()
    registrarEventosDoFundo(mapa, { aoFundoIndisponivel, aoFalhar })

    disparar("error", { sourceId: FONTES_MAPA.bairros })

    expect(aoFalhar).toHaveBeenCalledTimes(1)
    expect(aoFundoIndisponivel).not.toHaveBeenCalled()
  })
})

describe("registrarEventosDeBairro", () => {
  const camada = CAMADAS_MAPA.bairrosPreenchimento

  it("passar o mouse marca o bairro e desmarca o anterior", () => {
    const { mapa, disparar, setFeatureState, canvas } = criarMapaDouble()
    registrarEventosDeBairro(mapa, { aoSelecionar: jest.fn() })

    disparar("mousemove", noBairro("uv-01"), camada)
    disparar("mousemove", noBairro("uv-02"), camada)

    expect(setFeatureState).toHaveBeenNthCalledWith(
      1,
      { source: FONTES_MAPA.bairros, id: "uv-01" },
      { hover: true }
    )
    expect(setFeatureState).toHaveBeenNthCalledWith(
      2,
      { source: FONTES_MAPA.bairros, id: "uv-01" },
      { hover: false }
    )
    expect(setFeatureState).toHaveBeenNthCalledWith(
      3,
      { source: FONTES_MAPA.bairros, id: "uv-02" },
      { hover: true }
    )
    expect(canvas.style.cursor).toBe("pointer")
  })

  it("continuar no mesmo bairro não remarca nada", () => {
    const { mapa, disparar, setFeatureState } = criarMapaDouble()
    registrarEventosDeBairro(mapa, { aoSelecionar: jest.fn() })

    disparar("mousemove", noBairro("uv-01"), camada)
    disparar("mousemove", noBairro("uv-01"), camada)

    expect(setFeatureState).toHaveBeenCalledTimes(1)
  })

  it("sair do bairro desmarca o hover e devolve o cursor", () => {
    const { mapa, disparar, setFeatureState, canvas } = criarMapaDouble()
    registrarEventosDeBairro(mapa, { aoSelecionar: jest.fn() })
    disparar("mousemove", noBairro("uv-01"), camada)

    disparar("mouseleave", undefined, camada)

    expect(setFeatureState).toHaveBeenLastCalledWith(
      { source: FONTES_MAPA.bairros, id: "uv-01" },
      { hover: false }
    )
    expect(canvas.style.cursor).toBe("")
  })

  it("clicar no bairro seleciona o id", () => {
    const { mapa, disparar } = criarMapaDouble()
    const aoSelecionar = jest.fn()
    registrarEventosDeBairro(mapa, { aoSelecionar })

    disparar("click", noBairro("uv-10"), camada)

    expect(aoSelecionar).toHaveBeenCalledWith("uv-10")
  })

  it("clicar num marcador de escola sobre o bairro não seleciona o bairro", () => {
    const { mapa, disparar, queryRenderedFeatures } = criarMapaDouble()
    queryRenderedFeatures.mockReturnValue([{ properties: {} }] as never)
    const aoSelecionar = jest.fn()
    registrarEventosDeBairro(mapa, { aoSelecionar })

    disparar("click", noBairro("uv-10"), camada)

    expect(aoSelecionar).not.toHaveBeenCalled()
  })
})

describe("registrarEventosDeBairro com camadas de marcador (RF-04.03)", () => {
  const camada = CAMADAS_MAPA.bairrosPreenchimento

  it("clicar num marcador de obra sobre o bairro não seleciona o bairro", () => {
    const { mapa, disparar, queryRenderedFeatures } = criarMapaDouble()
    queryRenderedFeatures.mockReturnValue([{ properties: {} }] as never)
    const aoSelecionar = jest.fn()
    registrarEventosDeBairro(mapa, { aoSelecionar })

    disparar("click", noBairro("uv-10"), camada)

    expect(aoSelecionar).not.toHaveBeenCalled()
    expect(queryRenderedFeatures).toHaveBeenCalledWith(
      { x: 1, y: 2 },
      { layers: [CAMADAS_MAPA.escolas, CAMADAS_MAPA.obras] }
    )
  })

  it("só consulta as camadas de marcador que o estilo tem: sem elas o clique seleciona o bairro e nada é consultado", () => {
    const { mapa, disparar, queryRenderedFeatures, getLayer } =
      criarMapaDouble()
    getLayer.mockReturnValue(undefined)
    const aoSelecionar = jest.fn()
    registrarEventosDeBairro(mapa, { aoSelecionar })

    disparar("click", noBairro("uv-10"), camada)

    expect(queryRenderedFeatures).not.toHaveBeenCalled()
    expect(aoSelecionar).toHaveBeenCalledWith("uv-10")
  })

  it("com só a camada de obras no estilo, consulta só ela", () => {
    const { mapa, disparar, queryRenderedFeatures, getLayer } =
      criarMapaDouble()
    getLayer.mockImplementation((camadaDoEstilo?: unknown) =>
      camadaDoEstilo === CAMADAS_MAPA.obras ? {} : undefined
    )
    registrarEventosDeBairro(mapa, { aoSelecionar: jest.fn() })

    disparar("click", noBairro("uv-10"), camada)

    expect(queryRenderedFeatures).toHaveBeenCalledWith(
      { x: 1, y: 2 },
      { layers: [CAMADAS_MAPA.obras] }
    )
  })
})

describe("registrarEventosDeEscola", () => {
  it("clicar na escola abre pelo código INEP", () => {
    const { mapa, disparar } = criarMapaDouble()
    const aoAbrir = jest.fn()
    registrarEventosDeEscola(mapa, { aoAbrir })

    disparar(
      "click",
      { features: [{ properties: { codigoInep: "23000001" } }] },
      CAMADAS_MAPA.escolas
    )

    expect(aoAbrir).toHaveBeenCalledWith("23000001")
  })

  it("clique sem código não abre nada", () => {
    const { mapa, disparar } = criarMapaDouble()
    const aoAbrir = jest.fn()
    registrarEventosDeEscola(mapa, { aoAbrir })

    disparar("click", { features: [{ properties: {} }] }, CAMADAS_MAPA.escolas)

    expect(aoAbrir).not.toHaveBeenCalled()
  })

  it("o cursor vira ponteiro sobre a escola e volta ao sair", () => {
    const { mapa, disparar, canvas } = criarMapaDouble()
    registrarEventosDeEscola(mapa, { aoAbrir: jest.fn() })

    disparar("mouseenter", undefined, CAMADAS_MAPA.escolas)
    expect(canvas.style.cursor).toBe("pointer")
    disparar("mouseleave", undefined, CAMADAS_MAPA.escolas)

    expect(canvas.style.cursor).toBe("")
  })

  it("registra os ícones de escola quando o estilo carrega", () => {
    const { mapa, disparar, addImage } = criarMapaDouble()
    registrarEventosDeEscola(mapa, { aoAbrir: jest.fn() })

    disparar("style.load")

    expect(addImage).toHaveBeenCalled()
  })
})

describe("aoCarregarMapa", () => {
  // O jsdom não implementa `performance.mark`; o double sai ao fim de cada teste.
  const marcar = jest.fn()
  beforeEach(() => Object.assign(performance, { mark: marcar }))
  afterEach(() => Reflect.deleteProperty(performance, "mark"))

  it("no primeiro load avisa quem montou o mapa e expõe o gancho dos testes E2E", () => {
    const { mapa, disparar } = criarMapaDouble()
    const recipiente = document.createElement("div")
    const aoPronto = jest.fn()
    aoCarregarMapa(mapa, recipiente, aoPronto)

    disparar("load")

    expect(marcar).toHaveBeenCalledWith(MARCA_MAPA_INTERATIVO)
    expect(aoPronto).toHaveBeenCalledTimes(1)
    expect(recipiente.dataset.mapaPronto).toBe("true")
    expect(Reflect.get(recipiente, "mapa")).toBe(mapa)
  })
})

describe("registrarEventosDoCoropletico (DEC-T-07)", () => {
  it("registra a hachura de sem dados no style.load, que é quando o estilo aceita imagens", () => {
    const { mapa, disparar, addImage } = criarMapaDouble()

    registrarEventosDoCoropletico(mapa)
    expect(addImage).not.toHaveBeenCalled()
    disparar("style.load")

    expect(addImage).toHaveBeenCalledTimes(1)
    expect(addImage).toHaveBeenCalledWith(
      "hachura-sem-dados",
      expect.objectContaining({ width: 8, height: 8 })
    )
  })
})

describe("registrarEventosDeObra (RF-04.03, CA-04.27)", () => {
  const camada = CAMADAS_MAPA.obras

  it("registra uma imagem por situação quando o estilo carrega", () => {
    const { mapa, disparar, addImage } = criarMapaDouble()
    registrarEventosDeObra(mapa, { aoAbrir: jest.fn() })

    disparar("style.load")

    expect(addImage.mock.calls.map(([nome]) => nome).toSorted()).toEqual(
      Object.values(ICONES_OBRA)
        .map(({ imagem }) => imagem)
        .toSorted()
    )
  })

  it("clicar no marcador abre a obra pelo id", () => {
    const { mapa, disparar } = criarMapaDouble()
    const aoAbrir = jest.fn()
    registrarEventosDeObra(mapa, { aoAbrir })

    disparar("click", { features: [{ properties: { id: "obra-1" } }] }, camada)

    expect(aoAbrir).toHaveBeenCalledTimes(1)
    expect(aoAbrir).toHaveBeenCalledWith("obra-1")
  })

  it("clique sem feature identificável não abre nada", () => {
    const { mapa, disparar } = criarMapaDouble()
    const aoAbrir = jest.fn()
    registrarEventosDeObra(mapa, { aoAbrir })

    disparar("click", { features: [] }, camada)

    expect(aoAbrir).not.toHaveBeenCalled()
  })

  it("o cursor vira ponteiro sobre o marcador e volta ao sair", () => {
    const { mapa, disparar, canvas } = criarMapaDouble()
    registrarEventosDeObra(mapa, { aoAbrir: jest.fn() })

    disparar("mouseenter", undefined, camada)
    expect(canvas.style.cursor).toBe("pointer")
    disparar("mouseleave", undefined, camada)

    expect(canvas.style.cursor).toBe("")
  })
})

describe("registrarCliqueLivre (RF-04.16)", () => {
  it("devolve a coordenada do clique, com longitude e latitude", () => {
    const { mapa, disparar } = criarMapaDouble()
    const aoEscolher = jest.fn()
    registrarCliqueLivre(mapa, { aoEscolher })

    disparar("click", { lngLat: { lng: -40.118958, lat: -2.885116 } })

    expect(aoEscolher).toHaveBeenCalledTimes(1)
    expect(aoEscolher).toHaveBeenCalledWith({
      longitude: -40.118958,
      latitude: -2.885116,
    })
  })
})
