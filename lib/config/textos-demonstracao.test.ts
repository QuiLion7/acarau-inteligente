import { TEXTO_RESET_DEMO } from "@/lib/config/textos-demonstracao"

describe("TEXTO_RESET_DEMO", () => {
  it("diz que obras e históricos são apagados e que as obras de exemplo voltam (CA-04.29)", () => {
    expect(TEXTO_RESET_DEMO).toContain(
      "as obras cadastradas, com seus históricos"
    )
    expect(TEXTO_RESET_DEMO).toContain(
      "restaura o dataset e as obras de exemplo"
    )
  })

  it("segue dizendo que os datasets são apagados e que o território não muda", () => {
    expect(TEXTO_RESET_DEMO).toContain("apaga os datasets importados")
    expect(TEXTO_RESET_DEMO).toContain("Bairros, escolas e camadas não mudam")
  })

  it("não usa travessão nem meia-risca, só hífen (react-next §13)", () => {
    expect(TEXTO_RESET_DEMO).not.toMatch(/[—–]/)
  })
})
