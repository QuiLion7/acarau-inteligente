import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

import {
  CAMADAS_CONTROLAVEIS,
  CAMADAS_MAPA,
  CORES_COROPLETICO,
  ehErroDoFundo,
  filtroDaObraSelecionada,
  FONTES_MAPA,
  ICONES_ESCOLA,
  ICONES_OBRA,
  montarEstilo,
  visibilidadePorCamadaDoEstilo,
} from "./estilo-mapa"

const { bairros, limite, escolas } = obterDadosTerritorio()

describe("montarEstilo", () => {
  const estilo = montarEstilo({ bairros, limite })
  const idsDasCamadas = estilo.layers.map((camada) => camada.id)

  it("põe o fundo neutro antes do raster do OSM e as camadas da demonstração por cima, nesta ordem", () => {
    expect(idsDasCamadas).toEqual([
      CAMADAS_MAPA.fundoNeutro,
      CAMADAS_MAPA.fundoOsm,
      CAMADAS_MAPA.limite,
      CAMADAS_MAPA.bairrosPreenchimento,
      CAMADAS_MAPA.bairrosLinha,
      CAMADAS_MAPA.bairrosSelecao,
    ])
    expect(estilo.layers[0]?.type).toBe("background")
    expect(estilo.layers[1]?.type).toBe("raster")
  })

  it("liga o raster ao fundo configurado em mapa-base, com a atribuição do OSM", () => {
    const fundo = estilo.sources[FONTES_MAPA.fundo]

    expect(fundo).toMatchObject({
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      attribution: "© OpenStreetMap contributors",
    })
  })

  it("expõe os 24 bairros pelo ID estável, para o feature-state", () => {
    const fonte = estilo.sources[FONTES_MAPA.bairros]

    expect(fonte).toMatchObject({ type: "geojson", promoteId: "id" })
    const { data } = fonte as { data: { features: unknown[] } }
    expect(data.features).toHaveLength(24)
    expect(data.features[0]).toMatchObject({ properties: { id: "uv-01" } })
  })

  it("todas as camadas com fonte apontam para uma fonte existente", () => {
    const fontesUsadas = estilo.layers.flatMap((camada) =>
      "source" in camada ? [camada.source] : []
    )

    expect(fontesUsadas.length).toBeGreaterThan(0)
    for (const fonte of fontesUsadas) {
      expect(estilo.sources).toHaveProperty(fonte)
    }
  })
})

describe("montarEstilo com escolas", () => {
  const estilo = montarEstilo({ bairros, limite, escolas })

  it("põe as escolas por cima dos bairros, na última camada", () => {
    expect(estilo.layers.map((camada) => camada.id).slice(-2)).toEqual([
      CAMADAS_MAPA.bairrosSelecao,
      CAMADAS_MAPA.escolas,
    ])
    expect(estilo.layers.at(-1)).toMatchObject({
      type: "symbol",
      layout: { "icon-allow-overlap": true },
    })
  })

  it("leva 58 marcadores: as 4 escolas sem localização ficam de fora", () => {
    const fonte = estilo.sources[FONTES_MAPA.escolas] as unknown as {
      data: { features: { properties: { estado: string } }[] }
    }

    expect(fonte.data.features).toHaveLength(58)
    expect(
      fonte.data.features.some(
        ({ properties }) => properties.estado === "sem-localizacao"
      )
    ).toBe(false)
  })

  it("escolhe a imagem pelo estado da escola, uma para cada estado", () => {
    const camada = estilo.layers.at(-1) as {
      layout: { "icon-image": unknown[] }
    }
    const expressao = JSON.stringify(camada.layout["icon-image"])

    for (const { imagem } of Object.values(ICONES_ESCOLA)) {
      expect(expressao).toContain(imagem)
    }
  })

  it("sem escolas o estilo não leva a fonte nem a camada delas", () => {
    const semEscolas = montarEstilo({ bairros, limite })

    expect(semEscolas.sources).not.toHaveProperty(FONTES_MAPA.escolas)
    expect(semEscolas.layers.map(({ id }) => id)).not.toContain(
      CAMADAS_MAPA.escolas
    )
  })
})

describe("montarEstilo com obras (TU-07, PA-04.07)", () => {
  const OBRAS = [
    {
      id: "a",
      titulo: "Obra A",
      situacao: "planejada",
      longitude: -40.1,
      latitude: -2.9,
    },
    {
      id: "b",
      titulo: "Obra B",
      situacao: "suspensa",
      longitude: -40.2,
      latitude: -2.8,
    },
  ] as const
  const comObras = montarEstilo({ bairros, limite, obras: OBRAS })
  const camadaSelecionada = (estilo: ReturnType<typeof montarEstilo>) =>
    estilo.layers.find(({ id }) => id === CAMADAS_MAPA.obrasSelecionada) as {
      filter: unknown
    }

  it("sem a prop de obras o estilo não leva fontes nem camadas de obra, nem com escolas ou coroplético", () => {
    const outros = [
      montarEstilo({ bairros, limite }),
      montarEstilo({ bairros, limite, escolas }),
      montarEstilo({ bairros, limite, coropletico: {} }),
    ]

    for (const estilo of outros) {
      expect(estilo.sources).not.toHaveProperty(FONTES_MAPA.obras)
      expect(estilo.sources).not.toHaveProperty(FONTES_MAPA.obraProvisoria)
      expect(estilo.layers.map(({ id }) => id)).not.toEqual(
        expect.arrayContaining([CAMADAS_MAPA.obras])
      )
    }
  })

  it("acrescenta as fontes das obras e do ponto provisório e as três camadas no topo, nesta ordem", () => {
    expect(comObras.sources).toHaveProperty(FONTES_MAPA.obras)
    expect(comObras.sources).toHaveProperty(FONTES_MAPA.obraProvisoria)
    expect(comObras.layers.map(({ id }) => id).slice(-4)).toEqual([
      CAMADAS_MAPA.bairrosSelecao,
      CAMADAS_MAPA.obras,
      CAMADAS_MAPA.obrasSelecionada,
      CAMADAS_MAPA.obraProvisoria,
    ])
  })

  it("leva um marcador por obra recebida e o ponto provisório vazio quando não há ponto", () => {
    const obras = comObras.sources[FONTES_MAPA.obras] as unknown as {
      data: { features: unknown[] }
    }
    const provisorio = comObras.sources[
      FONTES_MAPA.obraProvisoria
    ] as unknown as {
      data: { features: unknown[] }
    }

    expect(obras.data.features).toHaveLength(2)
    expect(provisorio.data.features).toEqual([])
  })

  it("leva o ponto provisório quando ele já existe na montagem", () => {
    const estilo = montarEstilo({
      bairros,
      limite,
      obras: OBRAS,
      pontoProvisorio: { longitude: -40.1, latitude: -2.9 },
    })
    const provisorio = estilo.sources[
      FONTES_MAPA.obraProvisoria
    ] as unknown as {
      data: { features: unknown[] }
    }

    expect(provisorio.data.features).toHaveLength(1)
  })

  it("escolhe a imagem pela situação da obra, uma para cada situação", () => {
    const camada = comObras.layers.find(
      ({ id }) => id === CAMADAS_MAPA.obras
    ) as {
      layout: { "icon-image": unknown[]; "icon-allow-overlap": boolean }
    }
    const expressao = JSON.stringify(camada.layout["icon-image"])

    for (const { imagem } of Object.values(ICONES_OBRA)) {
      expect(expressao).toContain(imagem)
    }
    expect(camada.layout["icon-allow-overlap"]).toBe(true)
  })

  it("a camada de destaque filtra pelo id da obra selecionada e, sem seleção, não pega nenhuma", () => {
    const selecionada = montarEstilo({
      bairros,
      limite,
      obras: OBRAS,
      obraSelecionadaId: "b",
    })

    expect(camadaSelecionada(selecionada).filter).toEqual(
      filtroDaObraSelecionada("b")
    )
    expect(camadaSelecionada(selecionada).filter).toEqual([
      "==",
      ["get", "id"],
      "b",
    ])
    expect(camadaSelecionada(comObras).filter).toEqual([
      "==",
      ["get", "id"],
      "",
    ])
  })

  it("todas as camadas com fonte apontam para uma fonte existente", () => {
    const estilo = montarEstilo({ bairros, limite, escolas, obras: OBRAS })
    const fontesUsadas = estilo.layers.flatMap((camada) =>
      "source" in camada ? [camada.source] : []
    )

    for (const fonte of fontesUsadas) {
      expect(estilo.sources).toHaveProperty(fonte)
    }
  })
})

describe("visibilidadePorCamadaDoEstilo", () => {
  it("desligar bairros esconde as três camadas deles e mantém o limite", () => {
    const visibilidade = visibilidadePorCamadaDoEstilo(
      new Set(["limite-municipal"])
    )

    expect(visibilidade.get(CAMADAS_MAPA.bairrosPreenchimento)).toBe("none")
    expect(visibilidade.get(CAMADAS_MAPA.bairrosLinha)).toBe("none")
    expect(visibilidade.get(CAMADAS_MAPA.bairrosSelecao)).toBe("none")
    expect(visibilidade.get(CAMADAS_MAPA.limite)).toBe("visible")
  })

  it("o controle só oferece bairros, limite e escolas, os ids de camadas.json; escolas começa desligada", () => {
    expect(
      CAMADAS_CONTROLAVEIS.map(({ id, ligadaDeInicio }) => [id, ligadaDeInicio])
    ).toEqual([
      ["bairros", true],
      ["limite-municipal", true],
      ["escolas", false],
    ])
  })
})

describe("ehErroDoFundo", () => {
  it.each([
    [{ sourceId: FONTES_MAPA.fundo }, true],
    [{ sourceId: FONTES_MAPA.bairros }, false],
    [{ error: new Error("sem origem") }, false],
  ])("erro %j: %s", (evento, esperado) => {
    expect(ehErroDoFundo(evento)).toBe(esperado)
  })
})

const COROPLETICO = {
  "uv-10": { situacao: "valor", classe: 3 },
  "uv-13": { situacao: "zero", classe: null },
  "uv-01": { situacao: "sem-dados", classe: null },
} as const

describe("montarEstilo com coroplético (PA-02.08, DEC-T-07, DEC-T-08)", () => {
  const estilo = montarEstilo({ bairros, limite, coropletico: COROPLETICO })
  const camada = (id: string) => estilo.layers.find((item) => item.id === id)

  it("acrescenta as camadas das classes entre o preenchimento e a borda, mantendo a ordem do resto", () => {
    expect(estilo.layers.map(({ id }) => id)).toEqual([
      CAMADAS_MAPA.fundoNeutro,
      CAMADAS_MAPA.fundoOsm,
      CAMADAS_MAPA.limite,
      CAMADAS_MAPA.bairrosPreenchimento,
      CAMADAS_MAPA.bairrosCoropletico,
      CAMADAS_MAPA.bairrosSemDados,
      CAMADAS_MAPA.bairrosZeroLinha,
      CAMADAS_MAPA.bairrosLinha,
      CAMADAS_MAPA.bairrosSelecao,
    ])
  })

  it("o preenchimento antigo deixa de pintar e fica só para o clique e o hover", () => {
    expect(camada(CAMADAS_MAPA.bairrosPreenchimento)).toMatchObject({
      paint: { "fill-opacity": 0 },
    })
  })

  it("pinta as cinco classes com a paleta sequencial e o zero em branco", () => {
    const expressao = JSON.stringify(
      (camada(CAMADAS_MAPA.bairrosCoropletico) as { paint: object }).paint
    )

    for (const cor of CORES_COROPLETICO) expect(expressao).toContain(cor)
    expect(expressao).toContain("#ffffff")
    expect(CORES_COROPLETICO).toHaveLength(5)
  })

  it("o zero tem borda tracejada e o sem dados tem hachura, e cada um só pinta a sua situação", () => {
    expect(camada(CAMADAS_MAPA.bairrosZeroLinha)).toMatchObject({
      type: "line",
      filter: ["==", ["get", "situacao"], "zero"],
      paint: { "line-dasharray": [2, 2] },
    })
    expect(camada(CAMADAS_MAPA.bairrosSemDados)).toMatchObject({
      type: "fill",
      filter: ["==", ["get", "situacao"], "sem-dados"],
      paint: { "fill-pattern": "hachura-sem-dados" },
    })
  })

  it("todo polígono tem borda escura, e não a cor dos bairros do Território", () => {
    expect(camada(CAMADAS_MAPA.bairrosLinha)).toMatchObject({
      paint: { "line-color": "#1f2937" },
    })
  })

  it("leva situação e classe nas propriedades de cada bairro; bairro fora do objeto é sem dados", () => {
    const fonte = estilo.sources[FONTES_MAPA.bairros] as unknown as {
      data: { features: { properties: Record<string, unknown> }[] }
    }
    const porId = Object.fromEntries(
      fonte.data.features.map(({ properties }) => [properties.id, properties])
    )

    expect(porId["uv-10"]).toMatchObject({ situacao: "valor", classe: 3 })
    expect(porId["uv-13"]).toMatchObject({ situacao: "zero", classe: null })
    expect(porId["uv-01"]).toMatchObject({
      situacao: "sem-dados",
      classe: null,
    })
    expect(porId["uv-05"]).toMatchObject({
      situacao: "sem-dados",
      classe: null,
    })
  })

  it("sem o coroplético o estilo é o do Território, sem situação nem classe nas propriedades", () => {
    const comum = montarEstilo({ bairros, limite })
    const fonte = comum.sources[FONTES_MAPA.bairros] as unknown as {
      data: { features: { properties: Record<string, unknown> }[] }
    }

    expect(comum.layers.map(({ id }) => id)).not.toContain(
      CAMADAS_MAPA.bairrosCoropletico
    )
    expect(Object.keys(fonte.data.features[0]?.properties ?? {})).toEqual([
      "id",
      "nome",
      "uv",
    ])
  })
})
