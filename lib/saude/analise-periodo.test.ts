import { montarAnalisePeriodo } from "@/lib/saude/analise-periodo"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"
import type { SerieSaude } from "@/lib/validations/datasets-schema"

const BAIRROS: BairroResumo[] = [
  { id: "uv-01", uv: 1, nome: "Outra Banda", nomeLei: "OUTRA BANDA" },
  { id: "uv-02", uv: 2, nome: "Piranhas", nomeLei: "PIRANHAS" },
  { id: "uv-03", uv: 3, nome: "São Benedito", nomeLei: "SÃO BENEDITO" },
  { id: "uv-04", uv: 4, nome: "Mongubas", nomeLei: "MONGUBAS" },
]

const SERIE: SerieSaude = {
  periodos: ["2025", "2026"],
  valores: {
    "uv-01": { "2025": 12, "2026": 0 },
    "uv-02": { "2025": 8 },
    "uv-03": { "2025": null, "2026": 21 },
  },
  foraDaCobertura: { "2025": { casos: 6, localidades: 1 } },
}

function itemDo(periodo: string, id: string) {
  const item = montarAnalisePeriodo(SERIE, periodo, BAIRROS).bairros.find(
    ({ bairro }) => bairro.id === id
  )
  if (!item) throw new Error(`bairro ${id} ausente`)
  return item
}

describe("montarAnalisePeriodo (TU-16)", () => {
  it("traz os bairros recebidos na ordem recebida", () => {
    const { bairros } = montarAnalisePeriodo(SERIE, "2025", BAIRROS)

    expect(bairros.map(({ bairro }) => bairro.id)).toEqual([
      "uv-01",
      "uv-02",
      "uv-03",
      "uv-04",
    ])
  })

  it("distingue valor, zero explícito e sem dados, e nunca transforma ausência em zero", () => {
    expect(itemDo("2025", "uv-01")).toMatchObject({
      situacao: "valor",
      casos: 12,
    })
    expect(itemDo("2026", "uv-01")).toMatchObject({
      situacao: "zero",
      casos: 0,
      classe: null,
    })
    // Casos vazio na linha e bairro sem linha são os dois "sem dados".
    expect(itemDo("2025", "uv-03")).toMatchObject({
      situacao: "sem-dados",
      casos: null,
      classe: null,
    })
    expect(itemDo("2025", "uv-04")).toMatchObject({
      situacao: "sem-dados",
      casos: null,
    })
    expect(itemDo("2026", "uv-02")).toMatchObject({ situacao: "sem-dados" })
  })

  it("o total soma só valor e zero e conta os bairros com dados", () => {
    const { total } = montarAnalisePeriodo(SERIE, "2026", BAIRROS)

    expect(total).toEqual({ casos: 21, bairrosComDados: 2 })
  })

  it("o fora da cobertura não entra no total e vem separado, por período", () => {
    const em2025 = montarAnalisePeriodo(SERIE, "2025", BAIRROS)
    const em2026 = montarAnalisePeriodo(SERIE, "2026", BAIRROS)

    expect(em2025.total).toEqual({ casos: 20, bairrosComDados: 2 })
    expect(em2025.foraDaCobertura).toEqual({ casos: 6, localidades: 1 })
    expect(em2026.foraDaCobertura).toEqual({ casos: 0, localidades: 0 })
  })

  it("as classes usam só os valores positivos do período e a classe de cada bairro", () => {
    const analise = montarAnalisePeriodo(SERIE, "2025", BAIRROS)

    expect(
      analise.classes.classes.map(({ minimo, maximo }) => [minimo, maximo])
    ).toEqual([
      [8, 8],
      [12, 12],
    ])
    expect(itemDo("2025", "uv-02").classe).toBe(1)
    expect(itemDo("2025", "uv-01").classe).toBe(2)
  })

  it("período sem nenhum dado: nenhum bairro com dados, total zero de bairros e sem classes", () => {
    const analise = montarAnalisePeriodo(SERIE, "1999", BAIRROS)

    expect(analise.total).toEqual({ casos: 0, bairrosComDados: 0 })
    expect(analise.classes.classes).toEqual([])
    expect(
      analise.bairros.every(({ situacao }) => situacao === "sem-dados")
    ).toBe(true)
  })
})
