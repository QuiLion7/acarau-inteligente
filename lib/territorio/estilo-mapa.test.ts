import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

import {
  CAMADAS_CONTROLAVEIS,
  CAMADAS_MAPA,
  calcularEnquadramento,
  desenharIconeEscola,
  ehErroDoFundo,
  FONTES_MAPA,
  ICONES_ESCOLA,
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

function pixelsOpacos({ data }: { data: Uint8Array }) {
  return data.filter((valor, indice) => indice % 4 === 3 && valor === 255)
    .length
}

describe("desenharIconeEscola", () => {
  const icones = Object.values(ICONES_ESCOLA).map(desenharIconeEscola)

  it("gera uma imagem RGBA 24x24 por estado, com fundo transparente e miolo opaco", () => {
    for (const { width, height, data } of icones) {
      expect(width * height * 4).toBe(data.length)
      expect(data[3]).toBe(0)
      const meio = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4
      expect(data[meio + 3]).toBe(255)
    }
  })

  it("os três ícones são diferentes entre si (forma e cor, não só cor)", () => {
    const [circulo, quadrado, triangulo] = icones.map(({ data }) =>
      Buffer.from(data).toString("base64")
    )

    expect(new Set([circulo, quadrado, triangulo]).size).toBe(3)
  })

  it("as formas ocupam áreas diferentes: o quadrado é o maior e o triângulo, o menor", () => {
    const [circulo, quadrado, triangulo] = icones.map(pixelsOpacos)

    expect(quadrado).toBeGreaterThan(circulo!)
    expect(circulo).toBeGreaterThan(triangulo!)
  })

  it("o miolo usa a cor do estado e o contorno é branco", () => {
    const { data } = desenharIconeEscola(ICONES_ESCOLA["fora-do-limite"])
    const rgbEm = (linha: number, coluna: number) => {
      const inicio = (linha * 24 + coluna) * 4
      return [...data.slice(inicio, inicio + 3)]
    }

    expect(rgbEm(12, 12)).toEqual([0xb9, 0x1c, 0x1c])
    expect(rgbEm(21, 12)).toEqual([255, 255, 255])
  })
})

describe("calcularEnquadramento", () => {
  it("envolve todos os bairros", () => {
    const [[oeste, sul], [leste, norte]] = calcularEnquadramento(bairros)

    for (const { bbox } of bairros) {
      expect(bbox[0]).toBeGreaterThanOrEqual(oeste)
      expect(bbox[1]).toBeGreaterThanOrEqual(sul)
      expect(bbox[2]).toBeLessThanOrEqual(leste)
      expect(bbox[3]).toBeLessThanOrEqual(norte)
    }
  })

  it("com um bairro só devolve o retângulo dele", () => {
    const [centro] = bairros.filter(({ id }) => id === "uv-10")

    expect(calcularEnquadramento([centro!])).toEqual([
      [centro!.bbox[0], centro!.bbox[1]],
      [centro!.bbox[2], centro!.bbox[3]],
    ])
  })

  it("sem bairros falha com erro claro, em vez de enquadrar um lugar qualquer", () => {
    expect(() => calcularEnquadramento([])).toThrow("Sem bairros")
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
