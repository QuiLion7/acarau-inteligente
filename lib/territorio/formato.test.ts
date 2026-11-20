import { flexionar, formatarAreaM2 } from "./formato"

describe("formatarAreaM2", () => {
  it.each([
    [922822.4, "922.822,4 m²"],
    [64231.43, "64.231,4 m²"],
    [100, "100 m²"],
  ])("%d vira %s", (area, esperado) => {
    expect(formatarAreaM2(area)).toBe(esperado)
  })
})

describe("flexionar", () => {
  it.each([
    [0, "0 escolas"],
    [1, "1 escola"],
    [8, "8 escolas"],
  ])("com %d diz %s", (total, esperado) => {
    expect(flexionar(total, "escola", "escolas")).toBe(esperado)
  })
})
