import { act, render } from "@testing-library/react"

import { MapaTerritorio } from "@/components/territorio/mapa-territorio"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"
import { CAMADAS_MAPA, FONTES_MAPA } from "@/lib/territorio/estilo-mapa"

type Ouvinte = (evento?: unknown) => void

// O MapLibre não roda em jsdom (TechSpec EP-01 §8): o double guarda o que o componente pede ao mapa. Fábrica
// do jest.mock é içada, então o estado do double vive em objeto criado dentro dela e exposto por `jest.requireMock`.
jest.mock(
  "maplibre-gl",
  () => {
    const instancias: unknown[] = []
    class MapaDouble {
      estilo: { sources: Record<string, unknown>; layers: { id: string }[] }
      ouvintes = new Map<string, Ouvinte>()
      fontes = new Map<string, { setData: jest.Mock }>()
      setFilter = jest.fn()
      setLayoutProperty = jest.fn()
      setFeatureState = jest.fn()
      remove = jest.fn()
      constructor(opcoes: { style: MapaDouble["estilo"] }) {
        this.estilo = opcoes.style
        for (const id of Object.keys(opcoes.style.sources)) {
          this.fontes.set(id, {
            setData: jest.fn().mockResolvedValue(undefined),
          })
        }
        instancias.push(this)
      }
      on(evento: string, camadaOuOuvinte: string | Ouvinte, ouvinte?: Ouvinte) {
        const chave =
          typeof camadaOuOuvinte === "string"
            ? `${evento}:${camadaOuOuvinte}`
            : evento
        this.ouvintes.set(chave, ouvinte ?? (camadaOuOuvinte as Ouvinte))
      }
      getSource(id: string) {
        return this.fontes.get(id)
      }
      getLayer(id: string) {
        return this.estilo.layers.find((camada) => camada.id === id)
      }
      getCanvas() {
        return { style: { cursor: "" } }
      }
      addImage = jest.fn()
      queryRenderedFeatures = jest.fn(() => [])
    }
    return {
      Map: MapaDouble,
      setWorkerUrl: jest.fn(),
      GPUInitializationError: class extends Error {},
      __instancias: instancias,
    }
  },
  // `virtual`: o pacote só expõe condição de import, que o resolvedor do Jest não enxerga; o módulo real nunca carrega aqui.
  { virtual: true }
)

type MapaDoubleVisto = {
  estilo: { sources: Record<string, unknown>; layers: { id: string }[] }
  ouvintes: Map<string, Ouvinte>
  fontes: Map<string, { setData: jest.Mock }>
  setFilter: jest.Mock
  remove: jest.Mock
}
const { __instancias: instancias } = jest.requireMock("maplibre-gl") as {
  __instancias: MapaDoubleVisto[]
}

const { bairros, limite } = obterDadosTerritorio()
const OBRA_A = {
  id: "a",
  titulo: "Obra A",
  situacao: "planejada",
  longitude: -40.1,
  latitude: -2.9,
} as const
const OBRA_B = { ...OBRA_A, id: "b", situacao: "suspensa" } as const

function renderizar(props: Partial<Parameters<typeof MapaTerritorio>[0]> = {}) {
  return render(
    <MapaTerritorio
      bairros={bairros}
      limite={limite}
      onSelecionar={jest.fn()}
      {...props}
    />
  )
}

async function carregar(mapa: MapaDoubleVisto) {
  await act(async () => mapa.ouvintes.get("load")?.())
}

beforeEach(() => {
  instancias.length = 0
  // O jsdom não tem `performance.mark`, que o `load` do mapa usa para a marca de interatividade.
  Object.assign(performance, { mark: jest.fn() })
})

describe("MapaTerritorio sem obras (PA-04.07)", () => {
  it("monta o estilo sem fontes nem camadas de obra e não liga clique livre nem clique em obra", () => {
    renderizar()

    const [mapa] = instancias
    expect(mapa.estilo.sources).not.toHaveProperty(FONTES_MAPA.obras)
    expect(mapa.estilo.sources).not.toHaveProperty(FONTES_MAPA.obraProvisoria)
    expect(mapa.estilo.layers.map(({ id }) => id)).not.toContain(
      CAMADAS_MAPA.obras
    )
    expect(mapa.ouvintes.has("click")).toBe(false)
    expect(mapa.ouvintes.has(`click:${CAMADAS_MAPA.obras}`)).toBe(false)
  })

  it("o clique em bairro segue selecionando o bairro", () => {
    const onSelecionar = jest.fn()
    renderizar({ onSelecionar })

    instancias[0].ouvintes.get(`click:${CAMADAS_MAPA.bairrosPreenchimento}`)?.({
      features: [{ properties: { id: "uv-10" } }],
      point: { x: 1, y: 1 },
    })

    expect(onSelecionar).toHaveBeenCalledWith("uv-10")
  })
})

describe("MapaTerritorio com obras (DV-28, CA-04.02, CA-04.27)", () => {
  it("monta o estilo com as fontes de obra e os marcadores recebidos", () => {
    renderizar({ obras: [OBRA_A, OBRA_B] })

    const [mapa] = instancias
    expect(mapa.estilo.sources).toHaveProperty(FONTES_MAPA.obras)
    expect(mapa.estilo.layers.map(({ id }) => id)).toContain(CAMADAS_MAPA.obras)
  })

  it("trocar as obras atualiza a fonte com setData, sem recriar o mapa", async () => {
    const { rerender } = renderizar({ obras: [OBRA_A] })
    await carregar(instancias[0])

    rerender(
      <MapaTerritorio
        bairros={bairros}
        limite={limite}
        onSelecionar={jest.fn()}
        obras={[OBRA_A, OBRA_B]}
      />
    )

    expect(instancias).toHaveLength(1)
    const { setData } = instancias[0].fontes.get(FONTES_MAPA.obras)!
    const ultimaChamada = setData.mock.calls.at(-1)?.[0] as {
      features: unknown[]
    }
    expect(ultimaChamada.features).toHaveLength(2)
    expect(instancias[0].remove).not.toHaveBeenCalled()
  })

  it("trocar a obra selecionada muda o filtro da camada de destaque, sem recriar o mapa", async () => {
    const { rerender } = renderizar({ obras: [OBRA_A] })
    await carregar(instancias[0])

    rerender(
      <MapaTerritorio
        bairros={bairros}
        limite={limite}
        onSelecionar={jest.fn()}
        obras={[OBRA_A]}
        obraSelecionadaId="a"
      />
    )

    expect(instancias).toHaveLength(1)
    expect(instancias[0].setFilter).toHaveBeenLastCalledWith(
      CAMADAS_MAPA.obrasSelecionada,
      ["==", ["get", "id"], "a"]
    )
  })

  it("o ponto provisório vai à fonte própria e sai quando é removido", async () => {
    const { rerender } = renderizar({ obras: [OBRA_A] })
    await carregar(instancias[0])
    const { setData } = instancias[0].fontes.get(FONTES_MAPA.obraProvisoria)!

    rerender(
      <MapaTerritorio
        bairros={bairros}
        limite={limite}
        onSelecionar={jest.fn()}
        obras={[OBRA_A]}
        pontoProvisorio={{ longitude: -40.2, latitude: -2.8 }}
      />
    )
    rerender(
      <MapaTerritorio
        bairros={bairros}
        limite={limite}
        onSelecionar={jest.fn()}
        obras={[OBRA_A]}
        pontoProvisorio={null}
      />
    )

    const [, comPonto, semPonto] = setData.mock.calls.map(
      ([dados]) => (dados as { features: unknown[] }).features.length
    )
    expect([comPonto, semPonto]).toEqual([1, 0])
    expect(instancias).toHaveLength(1)
  })

  it("clicar no marcador abre a obra", () => {
    const onAbrirObra = jest.fn()
    renderizar({ obras: [OBRA_A], onAbrirObra })

    instancias[0].ouvintes.get(`click:${CAMADAS_MAPA.obras}`)?.({
      features: [{ properties: { id: "a" } }],
    })

    expect(onAbrirObra).toHaveBeenCalledWith("a")
  })
})

describe("MapaTerritorio no modo escolher ponto (RF-04.16)", () => {
  it("o clique livre devolve a coordenada", () => {
    const onEscolherPonto = jest.fn()
    renderizar({ obras: [OBRA_A], onEscolherPonto })

    instancias[0].ouvintes.get("click")?.({
      lngLat: { lng: -40.118958, lat: -2.885116 },
    })

    expect(onEscolherPonto).toHaveBeenCalledWith({
      longitude: -40.118958,
      latitude: -2.885116,
    })
  })

  it("o clique em bairro e em obra deixa de agir", () => {
    const onSelecionar = jest.fn()
    const onAbrirObra = jest.fn()
    renderizar({
      obras: [OBRA_A],
      onSelecionar,
      onAbrirObra,
      onEscolherPonto: jest.fn(),
    })

    instancias[0].ouvintes.get(`click:${CAMADAS_MAPA.bairrosPreenchimento}`)?.({
      features: [{ properties: { id: "uv-10" } }],
      point: { x: 1, y: 1 },
    })
    instancias[0].ouvintes.get(`click:${CAMADAS_MAPA.obras}`)?.({
      features: [{ properties: { id: "a" } }],
    })

    expect(onSelecionar).not.toHaveBeenCalled()
    expect(onAbrirObra).not.toHaveBeenCalled()
  })

  it("fechar o formulário (onEscolherPonto some) devolve o clique em bairro e em obra, sem recriar o mapa", () => {
    const onSelecionar = jest.fn()
    const onAbrirObra = jest.fn()
    const props = {
      bairros,
      limite,
      onSelecionar,
      onAbrirObra,
      obras: [OBRA_A],
    }
    const { rerender } = render(
      <MapaTerritorio {...props} onEscolherPonto={jest.fn()} />
    )

    rerender(<MapaTerritorio {...props} />)

    instancias[0].ouvintes.get(`click:${CAMADAS_MAPA.bairrosPreenchimento}`)?.({
      features: [{ properties: { id: "uv-10" } }],
      point: { x: 1, y: 1 },
    })
    instancias[0].ouvintes.get(`click:${CAMADAS_MAPA.obras}`)?.({
      features: [{ properties: { id: "a" } }],
    })
    expect(instancias).toHaveLength(1)
    expect(onSelecionar).toHaveBeenCalledWith("uv-10")
    expect(onAbrirObra).toHaveBeenCalledWith("a")
  })
})

describe("MapaTerritorio: o que mudou antes do load", () => {
  it("aplica obras, seleção e ponto provisório no load", async () => {
    renderizar({
      obras: [OBRA_A],
      obraSelecionadaId: "a",
      pontoProvisorio: { longitude: -40.2, latitude: -2.8 },
    })
    const [mapa] = instancias

    await carregar(mapa)

    expect(mapa.fontes.get(FONTES_MAPA.obras)?.setData).toHaveBeenCalledTimes(1)
    expect(
      mapa.fontes.get(FONTES_MAPA.obraProvisoria)?.setData
    ).toHaveBeenCalledTimes(1)
    expect(mapa.setFilter).toHaveBeenCalledWith(CAMADAS_MAPA.obrasSelecionada, [
      "==",
      ["get", "id"],
      "a",
    ])
  })
})
