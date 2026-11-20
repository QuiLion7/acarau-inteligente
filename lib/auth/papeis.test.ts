import { rotuloDoPapel, temPapel, type Papel } from "@/lib/auth/papeis"

describe("temPapel", () => {
  it.each<[Papel, Papel, boolean]>([
    ["visitante", "visitante", true],
    ["visitante", "analista", false],
    ["visitante", "administrador", false],
    ["analista", "visitante", true],
    ["analista", "analista", true],
    ["analista", "administrador", false],
    ["administrador", "visitante", true],
    ["administrador", "analista", true],
    ["administrador", "administrador", true],
  ])("com papel %s e mínimo %s devolve %s", (atual, minimo, esperado) => {
    expect(temPapel(atual, minimo)).toBe(esperado)
  })
})

describe("rotuloDoPapel", () => {
  it("dá o nome de exibição de cada papel restrito", () => {
    expect(rotuloDoPapel("analista")).toBe("Analista")
    expect(rotuloDoPapel("administrador")).toBe("Administrador")
  })
})
