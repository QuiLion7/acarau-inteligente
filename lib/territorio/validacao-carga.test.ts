import {
  blobGpkg,
  escolaCsv,
  escolaGpkg,
  inepDaEscola,
  insumosValidos,
  wkbMultiPoligono,
} from "./__fixtures__/gpkg"
import type { InsumosTerritorio } from "./insumos-carga"
import { validarCarga } from "./validacao-carga"

function regrasVioladas(insumos: InsumosTerritorio) {
  return validarCarga(insumos).falhas.map((falha) => falha.regra)
}

function comBairro(insumos: InsumosTerritorio, uv: number, parcial: object) {
  return {
    ...insumos,
    bairros: insumos.bairros.map((bairro) =>
      bairro.uv === uv ? { ...bairro, ...parcial } : bairro
    ),
  }
}

describe("validarCarga", () => {
  it("não aponta falha na base válida e devolve as geometrias decodificadas", () => {
    const { falhas, geometrias } = validarCarga(insumosValidos())

    expect(falhas).toEqual([])
    expect(geometrias.bairros).toHaveLength(24)
    expect(geometrias.limite).not.toBeNull()
  })

  it("falha com UV a menos, SRC diferente de 31984 e área divergente, uma falha por regra", () => {
    const base = insumosValidos()
    const insumos: InsumosTerritorio = {
      ...base,
      bairros: base.bairros.slice(1),
      srs: { ...base.srs, bairros: 4326 },
      relatorio: base.relatorio.map((linha) =>
        linha.uv === 2 ? { ...linha, area_calc_m2: 1_100_000 } : linha
      ),
    }

    const { falhas } = validarCarga(insumos)

    expect(falhas.map((falha) => falha.regra).toSorted()).toEqual([
      "AREA_DIVERGENTE",
      "SRC_INESPERADO",
      "UV_QUANTIDADE",
    ])
    expect(
      falhas.find((f) => f.regra === "SRC_INESPERADO")?.mensagem
    ).toContain("bairros em EPSG:4326")
    expect(
      falhas.find((f) => f.regra === "AREA_DIVERGENTE")?.mensagem
    ).toContain("UV 2")
  })

  it.each([
    ["limite", { limite: 4326 }],
    ["escolas", { escolas: 4674 }],
  ])("recusa SRC diferente em %s", (camada, srs) => {
    const base = insumosValidos()

    const { falhas } = validarCarga({ ...base, srs: { ...base.srs, ...srs } })

    expect(falhas).toEqual([
      expect.objectContaining({
        regra: "SRC_INESPERADO",
        mensagem: expect.stringContaining(camada),
      }),
    ])
  })

  it("aponta código de UV repetido e nome repetido na mesma regra", () => {
    const base = insumosValidos()
    const insumos = comBairro(comBairro(base, 2, { uv: 1 }), 3, {
      bairro: " bairro 4 ",
    })

    const { falhas } = validarCarga(insumos)
    const duplicada = falhas.find((falha) => falha.regra === "UV_DUPLICADA")

    expect(duplicada?.mensagem).toContain("código de UV repetido: 1")
    expect(duplicada?.mensagem).toContain("nome de bairro repetido: BAIRRO 4")
  })

  it("aponta UV sem linha no relatório de validação", () => {
    const base = insumosValidos()

    const { falhas } = validarCarga({
      ...base,
      relatorio: base.relatorio.filter((l) => l.uv !== 7),
    })

    expect(falhas).toEqual([
      expect.objectContaining({
        regra: "UV_SEM_RELATORIO",
        mensagem: expect.stringContaining("7"),
      }),
    ])
  })

  it("aceita diferença de área no limite de 0,01% e recusa logo acima", () => {
    const base = insumosValidos()
    const areaCom = (percentual: number) => 1_000_000 * (1 + percentual / 100)
    const comRelatorio = (area: number): InsumosTerritorio => ({
      ...base,
      relatorio: base.relatorio.map((l) =>
        l.uv === 1 ? { ...l, area_calc_m2: area } : l
      ),
    })

    expect(regrasVioladas(comRelatorio(areaCom(0.009)))).toEqual([])
    expect(regrasVioladas(comRelatorio(areaCom(0.02)))).toEqual([
      "AREA_DIVERGENTE",
    ])
  })

  it("trata área do relatório não numérica como divergente", () => {
    const base = insumosValidos()

    const regras = regrasVioladas({
      ...base,
      relatorio: base.relatorio.map((l) =>
        l.uv === 1 ? { ...l, area_calc_m2: Number.NaN } : l
      ),
    })

    expect(regras).toEqual(["AREA_DIVERGENTE"])
  })

  describe("geometria inválida", () => {
    const gravata = [
      [
        [0, 0],
        [10, 10],
        [10, 0],
        [0, 10],
        [0, 0],
      ],
    ] as [number, number][][]
    const aberto = [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
    ] as [number, number][][]
    const poucosPontos = [
      [
        [0, 0],
        [10, 0],
        [0, 0],
      ],
    ] as [number, number][][]
    const comNaN = [
      [
        [0, 0],
        [Number.NaN, 0],
        [10, 10],
        [0, 0],
      ],
    ] as [number, number][][]

    it.each([
      ["anel aberto", aberto, "aberto"],
      ["menos de 4 pontos", poucosPontos, "poucos-pontos"],
      ["coordenada NaN", comNaN, "coordenada-invalida"],
      ["gravata", gravata, "autointerseccao"],
    ])("rejeita %s e cita a UV", (_descricao, poligono, motivo) => {
      const geom = blobGpkg(wkbMultiPoligono([poligono]))

      const { falhas } = validarCarga(comBairro(insumosValidos(), 5, { geom }))
      const invalida = falhas.find(
        (falha) => falha.regra === "GEOMETRIA_INVALIDA"
      )

      expect(invalida?.mensagem).toContain("UV 5")
      expect(invalida?.mensagem).toContain(motivo)
    })

    it("rejeita polígono de área zero", () => {
      const reta = [
        [
          [0, 0],
          [10, 0],
          [20, 0],
          [0, 0],
        ],
      ] as [number, number][][]
      const geom = blobGpkg(wkbMultiPoligono([reta]))

      const { falhas } = validarCarga(comBairro(insumosValidos(), 5, { geom }))

      expect(falhas.map((f) => f.regra)).toContain("GEOMETRIA_INVALIDA")
    })

    it("rejeita blob que não decodifica, sem derrubar a validação das outras regras", () => {
      const geom = Uint8Array.from([1, 2, 3])

      const { falhas, geometrias } = validarCarga(
        comBairro(insumosValidos(), 5, { geom })
      )

      expect(falhas).toEqual([
        expect.objectContaining({
          regra: "GEOMETRIA_INVALIDA",
          mensagem: expect.stringContaining("UV 5"),
        }),
      ])
      expect(geometrias.bairros[4]).toBeNull()
    })
  })

  describe("limite municipal", () => {
    it.each([[0], [2]])(
      "falha quando há %i polígonos de limite",
      (quantidade) => {
        const base = insumosValidos()
        const limite = Array.from({ length: quantidade }, () => base.limite[0])

        const { falhas, geometrias } = validarCarga({ ...base, limite })

        expect(falhas.map((f) => f.regra)).toEqual(["LIMITE_QUANTIDADE"])
        expect(geometrias.limite).toBeNull()
      }
    )

    it("valida a geometria do limite", () => {
      const base = insumosValidos()
      const geom = blobGpkg(
        wkbMultiPoligono([
          [
            [
              [0, 0],
              [10, 10],
              [10, 0],
              [0, 10],
              [0, 0],
            ],
          ],
        ])
      )

      const { falhas } = validarCarga({
        ...base,
        limite: [{ ...base.limite[0], geom }],
      })

      expect(falhas[0]).toMatchObject({ regra: "GEOMETRIA_INVALIDA" })
      expect(falhas[0].mensagem).toContain("limite municipal")
    })
  })

  it("relata todas as regras violadas de uma vez", () => {
    const base = insumosValidos()
    const insumos: InsumosTerritorio = {
      ...base,
      bairros: base.bairros.slice(1),
      limite: [],
      srs: { bairros: 4326, limite: 31984, escolas: 31984 },
      relatorio: base.relatorio.filter((l) => l.uv !== 7),
    }

    expect(regrasVioladas(insumos).toSorted()).toEqual([
      "LIMITE_QUANTIDADE",
      "SRC_INESPERADO",
      "UV_QUANTIDADE",
      "UV_SEM_RELATORIO",
    ])
  })

  describe("escolas", () => {
    function comEscolasCsv(
      insumos: InsumosTerritorio,
      alterar: (
        linhas: InsumosTerritorio["escolasCsv"]
      ) => InsumosTerritorio["escolasCsv"]
    ): InsumosTerritorio {
      return { ...insumos, escolasCsv: alterar(insumos.escolasCsv) }
    }

    it("falha com INEP repetido e 5 escolas sem coordenada, uma falha por regra", () => {
      const base = insumosValidos()
      const insumos: InsumosTerritorio = {
        ...comEscolasCsv(base, (linhas) =>
          linhas.map((linha, i) =>
            i === 10 ? { ...linha, coordenadasValidas: false } : linha
          )
        ),
        escolasGpkg: [...base.escolasGpkg, base.escolasGpkg[0]],
      }

      const { falhas } = validarCarga(insumos)

      expect(falhas.map((falha) => falha.regra).toSorted()).toEqual([
        "ESCOLA_QUANTIDADE",
        "INEP_DUPLICADO",
        "INEP_INCOERENTE",
        "SEM_COORDENADA_QUANTIDADE",
      ])
      expect(
        falhas.find((f) => f.regra === "INEP_DUPLICADO")?.mensagem
      ).toContain(`no GeoPackage: ${inepDaEscola(1)}`)
      expect(
        falhas.find((f) => f.regra === "SEM_COORDENADA_QUANTIDADE")?.mensagem
      ).toContain("encontradas 5")
    })

    it("recusa INEP repetido no catálogo", () => {
      const base = insumosValidos()

      const { falhas } = validarCarga(
        comEscolasCsv(base, (linhas) =>
          linhas.map((l, i) =>
            i === 61 ? { ...l, codigoInep: inepDaEscola(1) } : l
          )
        )
      )

      const regras = falhas.map((f) => f.regra)
      expect(regras).toContain("INEP_DUPLICADO")
      expect(
        falhas.find((f) => f.regra === "INEP_DUPLICADO")?.mensagem
      ).toContain("no catálogo")
    })

    it("recusa escola com coordenada no catálogo e sem ponto no GeoPackage, e ponto sem linha no catálogo", () => {
      const base = insumosValidos()
      const insumos: InsumosTerritorio = {
        ...base,
        escolasGpkg: base.escolasGpkg.map((e, i) =>
          i === 0 ? { ...e, cod_inep: "99999999" } : e
        ),
      }

      const { falhas } = validarCarga(insumos)
      const incoerente = falhas.find((f) => f.regra === "INEP_INCOERENTE")

      expect(incoerente?.mensagem).toContain(
        `com coordenada no catálogo, mas sem ponto no GeoPackage: ${inepDaEscola(1)}`
      )
      expect(incoerente?.mensagem).toContain(
        "ponto no GeoPackage sem linha no catálogo: 99999999"
      )
    })

    it("recusa INEP sem coordenada no catálogo que tem ponto no GeoPackage", () => {
      const base = insumosValidos()
      const comPontoIndevido = base.escolasCsv.map((l) =>
        l.codigoInep === inepDaEscola(1)
          ? { ...l, coordenadasValidas: false }
          : l
      )

      const { falhas } = validarCarga({ ...base, escolasCsv: comPontoIndevido })

      expect(
        falhas.find((f) => f.regra === "INEP_INCOERENTE")?.mensagem
      ).toContain(
        `sem coordenada no catálogo, mas com ponto no GeoPackage: ${inepDaEscola(1)}`
      )
    })

    it.each([
      ["nome vazio", { nome: " " }, "nome vazio"],
      ["endereço vazio", { endereco: "" }, "endereco vazio"],
      [
        "situação vazia",
        { situacaoAtendimento: "" },
        "situacaoAtendimento vazio",
      ],
      [
        "dependência fora do domínio",
        { dependencia: "Comunitária" },
        'dependência fora do domínio ("Comunitária")',
      ],
      [
        "localização vazia",
        { localizacao: "" },
        'localização fora do domínio ("")',
      ],
    ])("recusa %s", (_descricao, parcial, texto) => {
      const base = insumosValidos()
      const insumos = comEscolasCsv(base, (linhas) =>
        linhas.map((l, i) => (i === 0 ? escolaCsv(1, parcial) : l))
      )

      const { falhas } = validarCarga(insumos)

      expect(falhas).toEqual([
        {
          regra: "CAMPO_OBRIGATORIO",
          mensagem: expect.stringContaining(
            `INEP ${inepDaEscola(1)}: ${texto}`
          ),
        },
      ])
    })

    it.each([
      [
        "coordenada não finita",
        escolaGpkg(1, [Number.NaN, 1]).geom,
        "coordenada não finita",
      ],
      [
        "blob que não decodifica",
        Uint8Array.from([1, 2]),
        "Geometria GeoPackage não suportada",
      ],
      [
        "geometria que não é ponto",
        blobGpkg(
          wkbMultiPoligono([
            [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          ])
        ),
        "Geometria GeoPackage não suportada: esperado Point",
      ],
    ])("rejeita ponto de escola com %s", (_descricao, geom, texto) => {
      const base = insumosValidos()
      const insumos = {
        ...base,
        escolasGpkg: base.escolasGpkg.map((e, i) =>
          i === 0 ? { ...e, geom } : e
        ),
      }

      const { falhas, geometrias } = validarCarga(insumos)

      expect(falhas).toEqual([
        {
          regra: "GEOMETRIA_INVALIDA",
          mensagem: expect.stringContaining(
            `escola INEP ${inepDaEscola(1)}: ${texto}`
          ),
        },
      ])
      expect(geometrias.escolas[0]).toBeNull()
    })

    it("decodifica os 58 pontos da base válida", () => {
      const { geometrias } = validarCarga(insumosValidos())

      expect(geometrias.escolas).toHaveLength(58)
      expect(geometrias.escolas.every((posicao) => posicao !== null)).toBe(true)
    })
  })
})
