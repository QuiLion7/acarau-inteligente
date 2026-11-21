import {
  formatarDataHora,
  rotuloDosPeriodos,
} from "@/lib/datasets/formato-versao"

describe("formatarDataHora", () => {
  it("mostra a data e a hora no fuso de Acaraú, não no do computador", () => {
    expect(formatarDataHora("2026-11-20T14:02:11.000Z")).toBe(
      "20/11/2026, 11:02"
    )
  })

  it("a virada do dia segue o fuso de Acaraú", () => {
    expect(formatarDataHora("2026-11-21T02:30:00.000Z")).toBe(
      "20/11/2026, 23:30"
    )
  })
})

describe("rotuloDosPeriodos", () => {
  it.each([
    [["2025", "2026"], "2025 a 2026"],
    [["2025-01", "2025-02", "2025-03"], "2025-01 a 2025-03"],
    [["2025"], "2025"],
    [[], "-"],
  ])("%j vira %s", (periodos, rotulo) => {
    expect(rotuloDosPeriodos(periodos)).toBe(rotulo)
  })
})
