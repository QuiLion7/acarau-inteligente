import { TEXTOS_RELATORIOS } from "@/lib/config/textos-relatorios"

function textosDe(valor: unknown): string[] {
  if (typeof valor === "string") return [valor]
  if (typeof valor === "function") return []
  if (valor && typeof valor === "object") {
    return Object.values(valor).flatMap(textosDe)
  }
  return []
}

describe("textos do relatório (DEC-T-14, RF-05.07)", () => {
  it("o título e o aviso curto usam hífen no lugar do travessão", () => {
    expect(TEXTOS_RELATORIOS.titulo).toBe(
      "Relatório territorial - Acaraú Inteligente (Demonstração Independente)"
    )
    expect(TEXTOS_RELATORIOS.versaoNaoPublicada).toBe(
      "Versão não publicada - uso interno"
    )
  })

  it("nenhum texto usa travessão ou meia-risca, nem se apresenta como sistema oficial", () => {
    const todos = textosDe(TEXTOS_RELATORIOS)

    for (const texto of todos) {
      expect(texto).not.toMatch(/[—–]/)
    }
    const oficiais = todos.filter((texto) => /oficial/i.test(texto))
    for (const texto of oficiais) {
      expect(texto).toMatch(/não constitui sistema oficial/i)
    }
  })

  it("traz os marcadores que o PDF precisa: demonstração, dados sintéticos e universo", () => {
    expect(TEXTOS_RELATORIOS.marcaDagua).toBe("DEMONSTRAÇÃO")
    expect(TEXTOS_RELATORIOS.dadosSinteticos).toBe("DADOS SINTÉTICOS")
    expect(TEXTOS_RELATORIOS.universo).toBe(
      "24 bairros da sede; não cobre o município inteiro"
    )
  })

  it("concorda o plural sem parênteses nos textos com número", () => {
    expect(TEXTOS_RELATORIOS.educacao.pendenciasForaDaCobertura(1)).toBe(
      "Fora da cobertura dos bairros: 1 escola."
    )
    expect(TEXTOS_RELATORIOS.educacao.pendenciasForaDaCobertura(33)).toBe(
      "Fora da cobertura dos bairros: 33 escolas."
    )
    expect(TEXTOS_RELATORIOS.fontes.obrasResumo(8, "15/11/2026 09:00")).toBe(
      "8 obras sintéticas; última atualização em 15/11/2026 09:00."
    )
    expect(TEXTOS_RELATORIOS.fontes.obrasResumo(0, null)).toBe(
      "Nenhuma obra cadastrada."
    )
  })

  it("lista as lacunas do gráfico como lacuna e não como zero", () => {
    expect(TEXTOS_RELATORIOS.saude.graficoLacunas(["2025-03"])).toContain(
      "não é zero"
    )
  })
})
