import type { ItemBairroPeriodo } from "@/lib/saude/analise-periodo"
import { ordenarRanking } from "@/lib/saude/ranking"

function item(
  id: string,
  nome: string,
  casos: number | null
): ItemBairroPeriodo {
  return {
    bairro: { id, uv: Number(id.slice(3)), nome, nomeLei: nome.toUpperCase() },
    situacao: casos === null ? "sem-dados" : casos === 0 ? "zero" : "valor",
    casos,
    classe: null,
  }
}

function nomes(itens: { bairro: { nome: string } }[]) {
  return itens.map(({ bairro }) => bairro.nome)
}

describe("ordenarRanking (TU-15, RN-02.11)", () => {
  it("ordena do maior para o menor número de casos", () => {
    const { ranking } = ordenarRanking([
      item("uv-01", "Centro", 10),
      item("uv-02", "Rodagem", 30),
      item("uv-03", "Morada", 20),
    ])

    expect(nomes(ranking)).toEqual(["Rodagem", "Morada", "Centro"])
  })

  it("desempata pelo nome normalizado, sem diferenciar acento nem caixa", () => {
    const { ranking } = ordenarRanking([
      item("uv-01", "São Benedito", 9),
      item("uv-02", "Açude Novo", 9),
      item("uv-03", "centro", 9),
      item("uv-04", "Bailarina", 9),
    ])

    expect(nomes(ranking)).toEqual([
      "Açude Novo",
      "Bailarina",
      "centro",
      "São Benedito",
    ])
  })

  it("o zero explícito entra no ranking, no fim; sem dados fica de fora e é citado à parte", () => {
    const { ranking, semDados } = ordenarRanking([
      item("uv-01", "Rodagem", 0),
      item("uv-02", "Piranhas", null),
      item("uv-03", "Centro", 5),
      item("uv-04", "Mongubas", null),
    ])

    expect(nomes(ranking)).toEqual(["Centro", "Rodagem"])
    expect(ranking[1]?.casos).toBe(0)
    expect(nomes(semDados.map((bairro) => ({ bairro })))).toEqual([
      "Mongubas",
      "Piranhas",
    ])
  })

  it("não altera a lista recebida", () => {
    const entrada = [item("uv-01", "B", 1), item("uv-02", "A", 2)]

    ordenarRanking(entrada)

    expect(nomes(entrada)).toEqual(["B", "A"])
  })

  it("sem nenhum item devolve listas vazias", () => {
    expect(ordenarRanking([])).toEqual({ ranking: [], semDados: [] })
  })
})
