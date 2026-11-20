import { itensDoMenu, moduloAtivo, moduloPorId } from "@/lib/config/modulos"

describe("itensDoMenu", () => {
  it("mostra só os cinco módulos ao visitante", () => {
    expect(itensDoMenu("visitante").map((item) => item.rotulo)).toEqual([
      "Território",
      "Saúde",
      "Educação",
      "Obras",
      "Relatórios",
    ])
  })

  it("acrescenta a área do analista ao analista, sem a administração", () => {
    const rotulos = itensDoMenu("analista").map((item) => item.rotulo)

    expect(rotulos).toContain("Área do analista")
    expect(rotulos).not.toContain("Administração")
  })

  it("mostra tudo ao administrador", () => {
    const rotulos = itensDoMenu("administrador").map((item) => item.rotulo)

    expect(rotulos).toEqual(
      expect.arrayContaining(["Área do analista", "Administração"])
    )
    expect(rotulos).toHaveLength(7)
  })
})

describe("moduloPorId", () => {
  it("devolve o módulo do catálogo pelo id", () => {
    expect(moduloPorId("saude")).toMatchObject({
      rotulo: "Saúde",
      rota: "/saude",
    })
  })

  it("falha para id fora do catálogo, em vez de inventar um módulo", () => {
    expect(() => moduloPorId("inexistente")).toThrow("fora do catálogo")
  })
})

describe("moduloAtivo", () => {
  it.each([
    ["/saude", "/saude", true],
    ["/saude", "/saude/detalhe", true],
    ["/saude", "/saude-outra", false],
    ["/saude", "/educacao", false],
    ["/saude", "/", false],
  ])("rota %s em %s: %s", (rota, pathname, esperado) => {
    expect(moduloAtivo(rota, pathname)).toBe(esperado)
  })
})
