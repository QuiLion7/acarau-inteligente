import { montarGraficoSvg } from "@/lib/relatorios/grafico-svg"
import type { PontoSerie } from "@/lib/saude/serie-temporal"

const OPCOES = {
  largura: 400,
  altura: 200,
  margem: { topo: 10, direita: 10, baixo: 30, esquerda: 40 },
}

function ponto(periodo: string, casos: number | null): PontoSerie {
  return { periodo, casos, bairrosComDados: casos === null ? 0 : 1 }
}

describe("montarGraficoSvg (TU-06, CA-05.03)", () => {
  it("liga os períodos consecutivos numa linha só, com um ponto por período e as marcas do eixo x", () => {
    const grafico = montarGraficoSvg(
      [ponto("2025-01", 10), ponto("2025-02", 20), ponto("2025-03", 5)],
      OPCOES
    )

    expect(grafico.trechos).toHaveLength(1)
    expect(grafico.trechos[0]).toMatch(/^M[\d. ]+ L[\d. ]+ L[\d. ]+$/)
    expect(
      grafico.pontos.map(({ periodo, casos }) => [periodo, casos])
    ).toEqual([
      ["2025-01", 10],
      ["2025-02", 20],
      ["2025-03", 5],
    ])
    expect(grafico.eixoX.map(({ rotulo }) => rotulo)).toEqual([
      "2025-01",
      "2025-02",
      "2025-03",
    ])
    expect(grafico.lacunas).toEqual([])
  })

  it("quebra a linha em cada null: dois trechos separados e a lacuna listada, nunca ligada nem zerada", () => {
    const grafico = montarGraficoSvg(
      [
        ponto("2025-01", 10),
        ponto("2025-02", 12),
        ponto("2025-03", null),
        ponto("2025-04", 7),
        ponto("2025-05", 9),
      ],
      OPCOES
    )

    expect(grafico.trechos).toHaveLength(2)
    expect(grafico.pontos.map(({ periodo }) => periodo)).toEqual([
      "2025-01",
      "2025-02",
      "2025-04",
      "2025-05",
    ])
    expect(grafico.lacunas).toEqual(["2025-03"])
  })

  it("um ponto isolado entre duas lacunas fica só como ponto, sem trecho", () => {
    const grafico = montarGraficoSvg(
      [ponto("2025-01", null), ponto("2025-02", 4), ponto("2025-03", null)],
      OPCOES
    )

    expect(grafico.trechos).toEqual([])
    expect(grafico.pontos).toHaveLength(1)
  })

  it("ordena os períodos mesmo que a série chegue fora de ordem", () => {
    const grafico = montarGraficoSvg(
      [ponto("2025-03", 5), ponto("2025-01", 10), ponto("2025-02", 20)],
      OPCOES
    )

    expect(grafico.eixoX.map(({ rotulo }) => rotulo)).toEqual([
      "2025-01",
      "2025-02",
      "2025-03",
    ])
    const xs = grafico.pontos.map(({ x }) => x)
    expect(xs).toEqual([...xs].sort((a, b) => a - b))
  })

  it("mantém todos os pontos dentro da área do gráfico, com o maior valor abaixo do teto do eixo", () => {
    const grafico = montarGraficoSvg(
      [ponto("2025", 0), ponto("2026", 137)],
      OPCOES
    )

    const { esquerda, direita, topo, base } = grafico.area
    for (const { x, y } of grafico.pontos) {
      expect(x).toBeGreaterThanOrEqual(esquerda)
      expect(x).toBeLessThanOrEqual(direita)
      expect(y).toBeGreaterThanOrEqual(topo)
      expect(y).toBeLessThanOrEqual(base)
    }
    // O zero fica na base e as marcas do eixo y são números redondos (teto 200 para 137).
    expect(grafico.pontos[0].y).toBe(base)
    expect(grafico.eixoY.map(({ rotulo }) => rotulo)).toEqual([
      "0",
      "50",
      "100",
      "150",
      "200",
    ])
  })

  it("um período só fica no meio da área e série vazia ou só de lacunas não desenha ponto nem linha", () => {
    const um = montarGraficoSvg([ponto("2025", 3)], OPCOES)
    const vazio = montarGraficoSvg([], OPCOES)
    const lacunas = montarGraficoSvg([ponto("2025", null)], OPCOES)

    expect(um.pontos[0].x).toBe(215)
    expect([vazio.pontos, vazio.trechos]).toEqual([[], []])
    expect([lacunas.pontos, lacunas.trechos]).toEqual([[], []])
    expect(vazio.eixoY.at(-1)?.rotulo).toBe("1")
  })
})
