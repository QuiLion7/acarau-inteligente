import {
  EVENTOS_AUDITORIA,
  TIPOS_EVENTO_AUDITORIA,
} from "@/lib/auditoria/eventos-auditoria"
import { TEXTOS_AUDITORIA } from "@/lib/config/textos-auditoria"

describe("textos da auditoria", () => {
  it("todo campo de detalhe do catálogo de eventos tem rótulo em português", () => {
    const campos = new Set(
      TIPOS_EVENTO_AUDITORIA.flatMap((tipo) => EVENTOS_AUDITORIA[tipo].detalhes)
    )

    for (const campo of campos) {
      expect(TEXTOS_AUDITORIA.detalhes[campo]).toBeTruthy()
    }
  })

  it("concorda o total de eventos com o número, sem plural entre parênteses", () => {
    expect(TEXTOS_AUDITORIA.tabela.total(1)).toBe("1 evento")
    expect(TEXTOS_AUDITORIA.tabela.total(25)).toBe("25 eventos")
  })

  it("não usa travessão nem meia-risca nos textos", () => {
    expect(JSON.stringify(TEXTOS_AUDITORIA)).not.toMatch(/[—–]/)
  })
})
