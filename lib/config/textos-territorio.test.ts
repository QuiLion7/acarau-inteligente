import {
  TEXTOS_TERRITORIO,
  textoEscolasGeorreferenciadas,
} from "@/lib/config/textos-territorio"

describe("textoEscolasGeorreferenciadas", () => {
  it.each([
    [58, "58 estabelecimentos escolares georreferenciados na base disponível."],
    [1, "1 estabelecimento escolar georreferenciado na base disponível."],
    [0, "0 estabelecimentos escolares georreferenciados na base disponível."],
  ])("com %i escola(s) diz %j", (total, esperado) => {
    expect(textoEscolasGeorreferenciadas(total)).toBe(esperado)
  })
})

describe("TEXTOS_TERRITORIO", () => {
  it("não usa travessão nem meia-risca, só hífen (react-next §13)", () => {
    for (const texto of Object.values(TEXTOS_TERRITORIO)) {
      expect(texto).not.toMatch(/[—–]/)
    }
  })

  it("nunca apresenta a demonstração como arquivo oficial", () => {
    expect(TEXTOS_TERRITORIO.avisoReconstrucao).toContain(
      "não é arquivo oficial homologado da Prefeitura"
    )
  })
})
