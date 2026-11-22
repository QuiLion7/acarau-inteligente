import {
  CATEGORIAS_OBRA,
  FORMA_MARCADOR_OBRA,
  ROTULO_CATEGORIA_OBRA,
  ROTULO_SITUACAO_OBRA,
  SITUACOES_OBRA,
} from "./situacao-obra"

describe("catálogo de obras", () => {
  it("tem rótulo para cada uma das quatro situações, na ordem do PRD", () => {
    expect(
      SITUACOES_OBRA.map((situacao) => ROTULO_SITUACAO_OBRA[situacao])
    ).toEqual(["Planejada", "Em andamento", "Concluída", "Suspensa"])
  })

  it("dá uma forma de marcador diferente a cada situação, para o significado não depender da cor", () => {
    const formas = SITUACOES_OBRA.map(
      (situacao) => FORMA_MARCADOR_OBRA[situacao]
    )

    expect(new Set(formas).size).toBe(SITUACOES_OBRA.length)
  })

  it("tem rótulo para cada uma das sete categorias", () => {
    expect(CATEGORIAS_OBRA).toHaveLength(7)
    for (const categoria of CATEGORIAS_OBRA) {
      expect(ROTULO_CATEGORIA_OBRA[categoria]).not.toBe("")
    }
  })
})
