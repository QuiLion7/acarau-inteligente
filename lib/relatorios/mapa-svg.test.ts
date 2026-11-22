import {
  estilizarBairros,
  LARGURA_CONTORNO,
  LARGURA_CONTORNO_DESTAQUE,
  projetarMapa,
  TRACEJADO_SEM_DADOS,
  TRACEJADO_ZERO,
} from "@/lib/relatorios/mapa-svg"
import { montarAnalisePeriodo } from "@/lib/saude/analise-periodo"
import {
  listarResumoBairros,
  obterDadosMapaResumo,
} from "@/lib/server/territorio/territorio-repositorio"
import { CORES_COROPLETICO } from "@/lib/territorio/estilo-mapa"
import { ANALISE_SAUDE } from "@/test/saude-fixtures"

const MOLDURA = { largura: 600, altura: 520, margem: 8 }
const mapa = obterDadosMapaResumo()

function numerosDe(d: string): number[] {
  return [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map(([n]) => Number(n))
}

describe("projetarMapa (TU-05, CA-05.03)", () => {
  const projetado = projetarMapa(mapa, MOLDURA)

  it("gera um caminho válido por bairro, 24 ao todo, com os ids do artefato", () => {
    expect(projetado.bairros).toHaveLength(24)
    expect(projetado.bairros.map(({ id }) => id)).toEqual(
      mapa.bairros.map(({ id }) => id)
    )
    for (const { d } of projetado.bairros) {
      expect(d).toMatch(
        /^M[\d. -]+( L[\d. -]+)* Z( M[\d. -]+( L[\d. -]+)* Z)*$/
      )
    }
  })

  it("mantém todo ponto dentro do viewBox, respeitando a margem", () => {
    expect(projetado.viewBox).toBe("0 0 600 520")
    const coordenadas = projetado.bairros.flatMap(({ d }) => numerosDe(d))
    const xs = coordenadas.filter((_, indice) => indice % 2 === 0)
    const ys = coordenadas.filter((_, indice) => indice % 2 === 1)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(MOLDURA.margem - 0.1)
    expect(Math.max(...xs)).toBeLessThanOrEqual(
      MOLDURA.largura - MOLDURA.margem + 0.1
    )
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(MOLDURA.margem - 0.1)
    expect(Math.max(...ys)).toBeLessThanOrEqual(
      MOLDURA.altura - MOLDURA.margem + 0.1
    )
  })

  it("mantém a proporção: o desenho toca a maior dimensão útil e a latitude cresce para cima", () => {
    const coordenadas = projetado.bairros.flatMap(({ d }) => numerosDe(d))
    const xs = coordenadas.filter((_, indice) => indice % 2 === 0)
    const ys = coordenadas.filter((_, indice) => indice % 2 === 1)
    const largura = Math.max(...xs) - Math.min(...xs)
    const altura = Math.max(...ys) - Math.min(...ys)
    const encosta =
      Math.abs(largura - (MOLDURA.largura - 2 * MOLDURA.margem)) < 0.5 ||
      Math.abs(altura - (MOLDURA.altura - 2 * MOLDURA.margem)) < 0.5
    expect(encosta).toBe(true)

    const norte = mapa.bairros.reduce((a, b) => (a.bbox[3] > b.bbox[3] ? a : b))
    const sul = mapa.bairros.reduce((a, b) => (a.bbox[1] < b.bbox[1] ? a : b))
    const yMedio = (id: string) => {
      const d = projetado.bairros.find((b) => b.id === id)!.d
      const valores = numerosDe(d).filter((_, indice) => indice % 2 === 1)
      return valores.reduce((s, v) => s + v, 0) / valores.length
    }
    expect(yMedio(norte.id)).toBeLessThan(yMedio(sul.id))
  })

  it("sem 'incluirLimite' não desenha o limite municipal; com ele enquadra e desenha o limite", () => {
    const comLimite = projetarMapa(mapa, { ...MOLDURA, incluirLimite: true })

    expect(projetado.limite).toBeNull()
    expect(comLimite.limite).toMatch(/^M/)
    const xsDoLimite = numerosDe(comLimite.limite ?? "").filter(
      (_, i) => i % 2 === 0
    )
    expect(Math.max(...xsDoLimite)).toBeLessThanOrEqual(MOLDURA.largura)
  })

  it("sem bairros devolve um mapa vazio no mesmo viewBox, sem quebrar", () => {
    const vazio = projetarMapa({ bairros: [], limite: mapa.limite }, MOLDURA)

    expect(vazio).toMatchObject({
      viewBox: "0 0 600 520",
      bairros: [],
      limite: null,
    })
  })
})

describe("estilizarBairros (TU-05, DV-20)", () => {
  const projetado = projetarMapa(mapa, MOLDURA)
  const resumos = listarResumoBairros()
  const analise = montarAnalisePeriodo(ANALISE_SAUDE, "2026", resumos)

  it("sem itens (Território) pinta todos iguais, sem traço, e destaca só o bairro do filtro com contorno grosso", () => {
    const estilos = estilizarBairros(projetado, {
      destaqueId: "uv-10",
      itens: null,
    })

    expect(new Set(estilos.map(({ fill }) => fill)).size).toBe(1)
    expect(
      estilos.every(({ strokeDasharray }) => strokeDasharray === null)
    ).toBe(true)
    const destacados = estilos.filter(({ destacado }) => destacado)
    expect(destacados.map(({ id }) => id)).toEqual(["uv-10"])
    expect(destacados[0].strokeWidth).toBe(LARGURA_CONTORNO_DESTAQUE)
    expect(estilos.find(({ id }) => id === "uv-01")?.strokeWidth).toBe(
      LARGURA_CONTORNO
    )
  })

  it("pinta o bairro com valor pela cor da classe, sem traço", () => {
    const estilos = estilizarBairros(projetado, {
      destaqueId: null,
      itens: analise.bairros,
    })

    const centro = estilos.find(({ id }) => id === "uv-10")!
    const classe = analise.bairros.find(
      ({ bairro }) => bairro.id === "uv-10"
    )!.classe!
    expect(centro).toMatchObject({
      situacao: "valor",
      fill: CORES_COROPLETICO[classe - 1],
      strokeDasharray: null,
    })
  })

  it("marca 'sem dados' e 'zero informado' em branco, com tracejados diferentes entre si", () => {
    const estilos = estilizarBairros(projetado, {
      destaqueId: null,
      itens: analise.bairros,
    })

    const zero = estilos.find(({ id }) => id === "uv-01")!
    const semDados = estilos.find(({ id }) => id === "uv-13")!
    expect(zero).toMatchObject({
      situacao: "zero",
      fill: "#ffffff",
      strokeDasharray: TRACEJADO_ZERO,
    })
    expect(semDados).toMatchObject({
      situacao: "sem-dados",
      fill: "#ffffff",
      strokeDasharray: TRACEJADO_SEM_DADOS,
    })
    expect(TRACEJADO_ZERO).not.toBe(TRACEJADO_SEM_DADOS)
  })

  it("o bairro destacado sem dados mantém o tracejado e ganha o contorno grosso", () => {
    const estilos = estilizarBairros(projetado, {
      destaqueId: "uv-13",
      itens: analise.bairros,
    })

    expect(estilos.find(({ id }) => id === "uv-13")).toMatchObject({
      destacado: true,
      situacao: "sem-dados",
      strokeDasharray: TRACEJADO_SEM_DADOS,
      strokeWidth: LARGURA_CONTORNO_DESTAQUE,
    })
  })
})
