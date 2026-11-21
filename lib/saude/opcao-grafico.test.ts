import { montarOpcaoGrafico, rotuloDosCasos } from "@/lib/saude/opcao-grafico"
import type { PontoSerie } from "@/lib/saude/serie-temporal"

const PONTOS: PontoSerie[] = [
  { periodo: "2024", casos: 40, bairrosComDados: 2 },
  { periodo: "2025", casos: null, bairrosComDados: 0 },
  { periodo: "2026", casos: 0, bairrosComDados: 1 },
]

type Opcao = {
  xAxis: { data: string[] }
  series: { data: (number | null)[]; connectNulls: boolean; name: string }[]
  tooltip: { valueFormatter: (valor: unknown) => string }
  aria: { enabled: boolean; label: { description: string } }
  yAxis: { axisLabel: { formatter: (valor: number) => string } }
}

function opcao() {
  return montarOpcaoGrafico(PONTOS, {
    serie: "Soma dos bairros com dados",
    unidade: "casos",
  }) as unknown as Opcao
}

describe("montarOpcaoGrafico (TU-28)", () => {
  it("um ponto por período, na ordem recebida", () => {
    expect(opcao().xAxis.data).toEqual(["2024", "2025", "2026"])
  })

  it("período sem dado é lacuna (null), o zero informado segue zero, e a linha não interpola", () => {
    const [serie] = opcao().series

    expect(serie?.data).toEqual([40, null, 0])
    expect(serie?.connectNulls).toBe(false)
    expect(serie?.name).toBe("Soma dos bairros com dados")
  })

  it("a dica mostra o número com a unidade e a lacuna como sem dados, nunca como zero", () => {
    const { valueFormatter } = opcao().tooltip

    expect(valueFormatter(40)).toBe("40 casos")
    expect(valueFormatter(1)).toBe("1 caso")
    expect(valueFormatter(0)).toBe("0 casos")
    expect(valueFormatter(null)).toBe("sem dados")
    expect(valueFormatter(undefined)).toBe("sem dados")
  })
})

describe("eixo", () => {
  it("separa o milhar em pt-BR", () => {
    expect(opcao().yAxis.axisLabel.formatter(100000)).toBe("100.000")
  })
})

describe("descrição para leitor de tela", () => {
  it("é em pt-BR, cita a série e cada período, e a lacuna é dita como sem dados", () => {
    const { aria } = opcao()

    expect(aria.enabled).toBe(true)
    expect(aria.label.description).toBe(
      "Gráfico de linha: Soma dos bairros com dados, por período. 2024: 40 casos; 2025: sem dados; 2026: 0 casos."
    )
  })
})

describe("rotuloDosCasos", () => {
  it.each([
    [1234, "1.234 casos"],
    [1, "1 caso"],
    [0, "0 casos"],
    [null, "sem dados"],
  ])("%s vira %s", (casos, rotulo) => {
    expect(rotuloDosCasos(casos)).toBe(rotulo)
  })
})
