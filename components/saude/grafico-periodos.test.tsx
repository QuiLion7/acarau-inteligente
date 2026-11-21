import { render, screen, within } from "@testing-library/react"

import { GraficoPeriodos } from "@/components/saude/grafico-periodos"
import type { SerieSaude } from "@/lib/validations/datasets-schema"

const setOption = jest.fn()
const resize = jest.fn()
const dispose = jest.fn()
const init = jest.fn()

// O ECharts precisa de canvas, que o jsdom não tem: o double guarda o que o componente configura.
jest.mock("echarts/core", () => ({
  use: jest.fn(),
  init: (...argumentos: unknown[]) => init(...argumentos),
}))
jest.mock("echarts/charts", () => ({ LineChart: {} }))
jest.mock("echarts/components", () => ({
  AriaComponent: {},
  GridComponent: {},
  TooltipComponent: {},
}))
jest.mock("echarts/renderers", () => ({ CanvasRenderer: {} }))

class ObservadorFalso {
  observe = jest.fn()
  disconnect = jest.fn()
}

const DOIS_PERIODOS: SerieSaude = {
  periodos: ["2025", "2026"],
  valores: {
    "uv-10": { "2025": 42, "2026": 51 },
    "uv-13": { "2025": 9, "2026": null },
  },
  foraDaCobertura: {},
}
const CENTRO = { id: "uv-10", uv: 10, nome: "Centro", nomeLei: "CENTRO" }

beforeEach(() => {
  jest.clearAllMocks()
  init.mockReturnValue({ setOption, resize, dispose })
  Object.assign(globalThis, { ResizeObserver: ObservadorFalso })
})

describe("GraficoPeriodos", () => {
  it("com um período só mostra o texto no lugar do gráfico (TU-28, CA-02.26)", () => {
    render(
      <GraficoPeriodos
        serie={{
          periodos: ["2025"],
          valores: { "uv-10": { "2025": 42 } },
          foraDaCobertura: {},
        }}
        bairro={null}
        unidade="casos"
      />
    )

    expect(
      screen.getByText(
        "O dataset tem um período só (2025): o gráfico por período precisa de dois ou mais."
      )
    ).toBeVisible()
    expect(screen.queryByRole("img")).toBeNull()
    expect(init).not.toHaveBeenCalled()
  })

  it("com dois períodos e todos os bairros: soma por período e quantos bairros entraram, em texto", () => {
    render(
      <GraficoPeriodos serie={DOIS_PERIODOS} bairro={null} unidade="casos" />
    )

    expect(
      screen.getByRole("heading", { name: "Casos por período" })
    ).toBeVisible()
    const valores = within(screen.getByRole("list")).getAllByRole("listitem")
    expect(valores.map((item) => item.textContent)).toEqual([
      "2025: 51 casos (2 bairros)",
      "2026: 51 casos (1 bairro)",
    ])
    expect(
      screen.getByRole("img", {
        name: "Gráfico de linha: Soma dos bairros com dados, por período",
      })
    ).toBeVisible()
  })

  it("com bairro selecionado mostra a série dele e a lacuna como sem dados, nunca zero", () => {
    render(
      <GraficoPeriodos
        serie={DOIS_PERIODOS}
        bairro={{ id: "uv-13", uv: 13, nome: "Rodagem", nomeLei: "RODAGEM" }}
        unidade="casos"
      />
    )

    expect(
      screen.getByRole("heading", { name: "Casos por período: Rodagem" })
    ).toBeVisible()
    expect(
      within(screen.getByRole("list"))
        .getAllByRole("listitem")
        .map((item) => item.textContent)
    ).toEqual(["2025: 9 casos", "2026: sem dados"])
  })

  it("cria o gráfico uma vez, configura a série sem interpolar e o descarta ao sair", () => {
    const { unmount, rerender } = render(
      <GraficoPeriodos serie={DOIS_PERIODOS} bairro={null} unidade="casos" />
    )

    expect(init).toHaveBeenCalledTimes(1)
    const [opcao, substituir] = setOption.mock.calls[0] ?? []
    expect(substituir).toBe(true)
    expect(opcao.series[0]).toMatchObject({
      data: [51, 51],
      connectNulls: false,
    })

    rerender(
      <GraficoPeriodos serie={DOIS_PERIODOS} bairro={CENTRO} unidade="casos" />
    )

    expect(init).toHaveBeenCalledTimes(1)
    expect(setOption.mock.calls.at(-1)?.[0].series[0]).toMatchObject({
      name: "Centro",
      data: [42, 51],
    })

    unmount()
    expect(dispose).toHaveBeenCalledTimes(1)
  })
})
