import { foraDaCoberturaDosBairros } from "@/lib/territorio/contagem-cobertura"

describe("foraDaCoberturaDosBairros (DV-39)", () => {
  it("tira do total do artefato a escola fora do limite municipal", () => {
    expect(
      foraDaCoberturaDosBairros({ foraDaCobertura: 34, foraDoLimite: 1 })
    ).toBe(33)
  })

  it("sem escola fora do limite, devolve o total do artefato", () => {
    expect(
      foraDaCoberturaDosBairros({ foraDaCobertura: 7, foraDoLimite: 0 })
    ).toBe(7)
  })

  it("quando todas as fora da cobertura estão fora do limite, é zero", () => {
    expect(
      foraDaCoberturaDosBairros({ foraDaCobertura: 2, foraDoLimite: 2 })
    ).toBe(0)
  })
})
