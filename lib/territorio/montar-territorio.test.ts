import {
  escolaGpkg,
  inepDaEscola,
  insumosValidos,
  LADO_BAIRRO,
  ORIGEM_X,
  ORIGEM_Y,
} from "./__fixtures__/gpkg"
import {
  artefatoCamadasSchema,
  artefatoTerritorioSchema,
} from "./artefato-schema"
import { localizarPonto } from "./geometria"
import type { InsumosTerritorio } from "./insumos-carga"
import { montarTerritorio, REGRA_FRONTEIRA } from "./montar-territorio"

function montarOk(insumos: InsumosTerritorio = insumosValidos()) {
  const resultado = montarTerritorio(insumos)
  if (!resultado.ok)
    throw new Error(`falhou: ${JSON.stringify(resultado.falhas)}`)
  return resultado
}

describe("montarTerritorio", () => {
  it("monta 24 bairros em ordem de UV com id estável, grafia de título e fonte com página", () => {
    const { territorio } = montarOk()

    expect(territorio.bairros).toHaveLength(24)
    expect(territorio.bairros.map((b) => b.uv)).toEqual(
      Array.from({ length: 24 }, (_, i) => i + 1)
    )
    expect(territorio.bairros[2]).toMatchObject({
      id: "uv-03",
      nome: "Bairro 3",
      nomeLei: "BAIRRO 3",
      fonte: "Lei Municipal 2.172/2026, art. 8º, I, p. 29",
      etiqueta: "DERIVADO_VALIDAR",
      cobertura: "sede",
      versaoGeometria: "aaaaaaaaaaaa",
    })
  })

  it("ordena por UV mesmo quando o arquivo vem fora de ordem", () => {
    const base = insumosValidos()

    const { territorio } = montarOk({
      ...base,
      bairros: base.bairros.toReversed(),
    })

    expect(territorio.bairros[0].id).toBe("uv-01")
    expect(territorio.bairros[23].id).toBe("uv-24")
  })

  it("calcula a área em metros (1 casa) e deixa a área da lei nula quando o relatório não a traz", () => {
    const { territorio } = montarOk()

    expect(territorio.bairros[0].areaCalculadaM2).toBe(1_000_000)
    expect(territorio.bairros[0].areaLeiM2).toBe(1_000_000)
    expect(territorio.bairros[4].areaLeiM2).toBeNull()
  })

  it("reprojeta para lon/lat e dá a cada bairro um ponto interior e um bbox em graus", () => {
    const { territorio } = montarOk()

    for (const bairro of territorio.bairros) {
      const [oeste, sul, leste, norte] = bairro.bbox
      expect(oeste).toBeLessThan(leste)
      expect(sul).toBeLessThan(norte)
      expect(oeste).toBeGreaterThan(-41)
      expect(norte).toBeLessThan(-2)
      expect(
        localizarPonto(bairro.pontoInterior, bairro.geometria.coordinates)
      ).toBe("dentro")
    }
  })

  it("monta o limite com nome, código IBGE, fonte IPECE e etiqueta oficial", () => {
    const { territorio } = montarOk()

    expect(territorio.limite).toMatchObject({
      nome: "Acaraú",
      codigoIbge: "2300200",
      fonte: "IPECE",
      etiqueta: "OFICIAL_FONTE",
      versao: "aaaaaaaaaaaa",
    })
    expect(territorio.limite.geometria.type).toBe("MultiPolygon")
  })

  it("anuncia bairros, escolas e limite, cada um com a versão do seu insumo e data de referência nula", () => {
    const { camadas } = montarOk()

    expect(camadas.camadas).toEqual([
      {
        id: "bairros",
        versao: "aaaaaaaaaaaa",
        dataReferencia: null,
        registros: 24,
      },
      {
        id: "escolas",
        versao: "cccccccccccc",
        dataReferencia: null,
        registros: 62,
      },
      {
        id: "limite-municipal",
        versao: "aaaaaaaaaaaa",
        dataReferencia: null,
        registros: 1,
      },
    ])
  })

  it("gera artefatos que passam nos schemas e saem idênticos a cada execução", () => {
    const primeira = montarOk()
    const segunda = montarOk()

    expect(
      artefatoTerritorioSchema.safeParse(primeira.territorio).success
    ).toBe(true)
    expect(artefatoCamadasSchema.safeParse(primeira.camadas).success).toBe(true)
    expect(JSON.stringify(segunda)).toBe(JSON.stringify(primeira))
  })

  it("devolve as falhas e nenhum artefato quando um insumo não confere", () => {
    const base = insumosValidos()

    const resultado = montarTerritorio({
      ...base,
      bairros: base.bairros.slice(1),
    })

    expect(resultado).toEqual({
      ok: false,
      falhas: [expect.objectContaining({ regra: "UV_QUANTIDADE" })],
    })
  })

  it("não monta nada quando um blob de bairro não decodifica", () => {
    const base = insumosValidos()
    const bairros = base.bairros.map((b) =>
      b.uv === 3 ? { ...b, geom: Uint8Array.from([1]) } : b
    )

    expect(montarTerritorio({ ...base, bairros }).ok).toBe(false)
  })
})

describe("montarTerritorio: escolas", () => {
  it("monta as 62 escolas em ordem de código INEP, só com os campos do contrato", () => {
    const { territorio } = montarOk()

    expect(territorio.escolas).toHaveLength(62)
    expect(territorio.escolas.map((e) => e.codigoInep)).toEqual(
      territorio.escolas.map((e) => e.codigoInep).toSorted()
    )
    expect(territorio.escolas[0]).toEqual({
      codigoInep: "23000001",
      nome: "ESCOLA 1",
      endereco: "RUA 1, S/N",
      dependencia: "Privada",
      localizacao: "Urbana",
      situacaoAtendimento:
        "ESCOLA EM FUNCIONAMENTO E SEM RESTRIÇÃO DE ATENDIMENTO",
      estado: "dentro-de-bairro",
      bairroId: "uv-01",
      posicao: expect.any(Array),
      etiqueta: "OFICIAL_FONTE",
      fonte: "Catálogo de escolas do INEP (CSV fornecido)",
      versao: "cccccccccccc",
      dataReferencia: null,
    })
  })

  it("conta cada escola dentro de bairro uma única vez e deixa as de fora sem bairro", () => {
    const { territorio } = montarOk()

    const somaDosBairros = territorio.bairros.reduce(
      (soma, b) => soma + b.totalEscolas,
      0
    )
    const foraDaCobertura = territorio.escolas.filter(
      (e) => e.estado === "fora-da-cobertura"
    )

    expect(somaDosBairros).toBe(24)
    expect(territorio.bairros.every((b) => b.totalEscolas === 1)).toBe(true)
    expect(foraDaCobertura).toHaveLength(33)
    expect(
      foraDaCobertura.every((e) => e.bairroId === null && e.posicao !== null)
    ).toBe(true)
  })

  it("não dá posição às escolas sem coordenada e as etiqueta como não georreferenciadas", () => {
    const { territorio } = montarOk()

    const semLocalizacao = territorio.escolas.filter(
      (e) => e.estado === "sem-localizacao"
    )

    expect(semLocalizacao.map((e) => e.codigoInep)).toEqual([
      "23000059",
      "23000060",
      "23000061",
      "23000062",
    ])
    for (const escola of semLocalizacao) {
      expect(escola).toMatchObject({
        posicao: null,
        bairroId: null,
        etiqueta: "NAO_GEOREFERENCIADO",
      })
    }
  })

  it("mantém a escola fora do limite no mapa, sem bairro, e a lista na qualidade", () => {
    const { territorio } = montarOk()

    const fora = territorio.escolas.find((e) => e.estado === "fora-do-limite")

    expect(fora).toMatchObject({
      codigoInep: "23000058",
      bairroId: null,
      etiqueta: "OFICIAL_FONTE",
    })
    expect(fora?.posicao).not.toBeNull()
    expect(territorio.qualidade.foraDoLimiteLista).toEqual([
      { codigoInep: "23000058", nome: "ESCOLA 58" },
    ])
  })

  it("calcula a qualidade com os números da base: 62, 58, 4, 24, 34 e 1", () => {
    const { territorio } = montarOk()

    expect(territorio.qualidade).toMatchObject({
      totalCatalogo: 62,
      comLocalizacao: 58,
      semLocalizacao: 4,
      dentroDeBairros: 24,
      foraDaCobertura: 34,
      foraDoLimite: 1,
    })
    expect(territorio.qualidade.semLocalizacaoLista).toHaveLength(4)
    expect(
      territorio.qualidade.dentroDeBairros +
        territorio.qualidade.foraDaCobertura
    ).toBe(58)
  })

  it("atribui escola na fronteira de dois bairros ao de menor UV e registra o caso", () => {
    const base = insumosValidos()
    const naFronteira = escolaGpkg(1, [
      ORIGEM_X + LADO_BAIRRO,
      ORIGEM_Y + LADO_BAIRRO / 2,
    ])
    const escolasGpkg = base.escolasGpkg.map((e) =>
      e.cod_inep === inepDaEscola(1) ? naFronteira : e
    )

    const { territorio } = montarOk({ ...base, escolasGpkg })

    expect(territorio.escolas[0]).toMatchObject({
      estado: "dentro-de-bairro",
      bairroId: "uv-01",
    })
    expect(territorio.casosFronteira).toEqual([
      { codigoInep: inepDaEscola(1), uvs: [1, 2], uvAtribuida: 1 },
    ])
    expect(
      territorio.bairros.reduce((soma, b) => soma + b.totalEscolas, 0)
    ).toBe(24)
    expect(territorio.bairros[0].totalEscolas).toBe(1)
    expect(territorio.bairros[1].totalEscolas).toBe(1)
  })

  it("registra a regra de fronteira no próprio artefato e não acusa caso quando nenhuma escola toca fronteira", () => {
    const { territorio } = montarOk()

    expect(territorio.regraFronteira).toBe(REGRA_FRONTEIRA)
    expect(territorio.regraFronteira).toContain("menor código de UV")
    expect(territorio.casosFronteira).toEqual([])
  })
})
