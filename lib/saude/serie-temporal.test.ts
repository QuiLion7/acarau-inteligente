import { montarSerieTemporal } from "@/lib/saude/serie-temporal"
import type { SerieSaude } from "@/lib/validations/datasets-schema"

const SERIE: SerieSaude = {
  periodos: ["2024", "2025", "2026"],
  valores: {
    "uv-10": { "2024": 40, "2025": 42, "2026": 51 },
    "uv-13": { "2024": 5, "2025": null, "2026": 0 },
    "uv-20": { "2025": 14 },
  },
  foraDaCobertura: {},
}

describe("montarSerieTemporal (TU-17)", () => {
  it("com bairro devolve a série dele, um ponto por período", () => {
    expect(montarSerieTemporal(SERIE, "uv-10")).toEqual([
      { periodo: "2024", casos: 40, bairrosComDados: 1 },
      { periodo: "2025", casos: 42, bairrosComDados: 1 },
      { periodo: "2026", casos: 51, bairrosComDados: 1 },
    ])
  })

  it("período sem dado do bairro é lacuna, nunca zero; o zero explícito segue zero", () => {
    expect(montarSerieTemporal(SERIE, "uv-13")).toEqual([
      { periodo: "2024", casos: 5, bairrosComDados: 1 },
      { periodo: "2025", casos: null, bairrosComDados: 0 },
      { periodo: "2026", casos: 0, bairrosComDados: 1 },
    ])
  })

  it("bairro sem nenhuma linha dá lacuna em todos os períodos", () => {
    expect(
      montarSerieTemporal(SERIE, "uv-99").map(({ casos }) => casos)
    ).toEqual([null, null, null])
  })

  it("sem bairro soma os bairros com dados de cada período e diz quantos entraram", () => {
    expect(montarSerieTemporal(SERIE, null)).toEqual([
      { periodo: "2024", casos: 45, bairrosComDados: 2 },
      { periodo: "2025", casos: 56, bairrosComDados: 2 },
      { periodo: "2026", casos: 51, bairrosComDados: 2 },
    ])
  })

  it("período em que nenhum bairro tem dado é lacuna na soma, sem interpolar", () => {
    const serie: SerieSaude = {
      periodos: ["2025", "2026"],
      valores: { "uv-10": { "2025": 7 } },
      foraDaCobertura: {},
    }

    expect(montarSerieTemporal(serie, null)).toEqual([
      { periodo: "2025", casos: 7, bairrosComDados: 1 },
      { periodo: "2026", casos: null, bairrosComDados: 0 },
    ])
  })
})
