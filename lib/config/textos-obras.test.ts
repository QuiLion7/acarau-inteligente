import { TEXTOS_OBRAS } from "@/lib/config/textos-obras"

function textosDe(valor: unknown): string[] {
  if (typeof valor === "string") return [valor]
  if (valor && typeof valor === "object") {
    return Object.values(valor).flatMap(textosDe)
  }
  return []
}

describe("TEXTOS_OBRAS", () => {
  it("traz as mensagens do PRD §7 como escritas", () => {
    expect(TEXTOS_OBRAS.vazio.comFiltros).toBe("Nenhuma obra com estes filtros")
    expect(TEXTOS_OBRAS.obraSalva).toBe("Obra salva")
    expect(TEXTOS_OBRAS.localizacao).toEqual({
      foraDaCobertura: "Fora da cobertura dos bairros",
      semLocalizacao: "Sem localização",
      foraDoMunicipio: "O ponto está fora do município de Acaraú",
    })
    expect(TEXTOS_OBRAS.valorPrevisto.aviso).toBe(
      "Valor previsto - não é valor pago"
    )
  })

  it("diz a mudança de situação com os rótulos de exibição", () => {
    expect(TEXTOS_OBRAS.situacaoAlterada("planejada", "em_andamento")).toBe(
      "Situação alterada de Planejada para Em andamento"
    )
  })

  it("diz a situação da entrada inicial do histórico", () => {
    expect(TEXTOS_OBRAS.historico.inicial("suspensa")).toBe(
      "Obra criada como Suspensa"
    )
  })

  it.each([
    [0, "0 obras"],
    [1, "1 obra"],
    [8, "8 obras"],
  ])("concorda o substantivo com o total (%i)", (total, texto) => {
    expect(TEXTOS_OBRAS.quantidade(total)).toBe(texto)
  })

  it("avisa que os dados são sintéticos e que as obras não são municipais", () => {
    expect(TEXTOS_OBRAS.faixaSintetico).toContain("sintéticos")
    expect(TEXTOS_OBRAS.faixaSintetico).toContain("Não são obras municipais")
  })

  it("não usa travessão nem meia-risca, só hífen (react-next §13)", () => {
    const textos = [
      ...textosDe(TEXTOS_OBRAS),
      TEXTOS_OBRAS.situacaoAlterada("concluida", "suspensa"),
      TEXTOS_OBRAS.historico.inicial("planejada"),
    ]

    for (const texto of textos) {
      expect(texto).not.toMatch(/[—–]/)
    }
  })
})
