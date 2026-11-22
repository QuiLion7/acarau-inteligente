import { formatarGeracao } from "@/lib/exportacao/data-geracao"

describe("formatarGeracao (R-09)", () => {
  it("escreve o instante no horário de Brasília, mesmo com o relógio do aparelho em outro fuso", () => {
    expect(formatarGeracao(new Date("2026-11-22T13:53:00.000Z"))).toBe(
      "22/11/2026 10:53 (horário de Brasília)"
    )
  })

  it("vira o dia em Brasília, não em UTC", () => {
    expect(formatarGeracao(new Date("2026-11-22T01:30:00.000Z"))).toBe(
      "21/11/2026 22:30 (horário de Brasília)"
    )
  })
})
