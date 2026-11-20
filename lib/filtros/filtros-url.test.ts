import { comFiltros, lerFiltros, TODOS } from "@/lib/filtros/filtros-url"

function parametros(consulta: string): URLSearchParams {
  return new URLSearchParams(consulta)
}

describe("lerFiltros", () => {
  it("lê bairro e período da URL", () => {
    expect(lerFiltros(parametros("bairro=Centro&periodo=2025"))).toEqual({
      bairro: "Centro",
      periodo: "2025",
    })
  })

  it.each([
    ["ausente", ""],
    ["vazio", "bairro=&periodo="],
    ["só espaços", "bairro=%20%20&periodo=%20"],
  ])("vira Todos quando o filtro está %s", (_caso, consulta) => {
    expect(lerFiltros(parametros(consulta))).toEqual({
      bairro: TODOS,
      periodo: TODOS,
    })
  })

  it("apara os espaços das pontas", () => {
    expect(lerFiltros(parametros("bairro=%20Centro%20")).bairro).toBe("Centro")
  })

  it("corta em 80 caracteres e mantém 80 inteiros", () => {
    const exato = "a".repeat(80)
    const longo = "b".repeat(81)

    expect(lerFiltros(parametros(`bairro=${exato}`)).bairro).toBe(exato)
    expect(lerFiltros(parametros(`bairro=${longo}`)).bairro).toBe(
      "b".repeat(80)
    )
  })

  it("ignora outros parâmetros da URL", () => {
    expect(lerFiltros(parametros("x=1&bairro=Centro")).periodo).toBe(TODOS)
  })
})

describe("comFiltros", () => {
  it("reaplica bairro e período ao link", () => {
    const filtros = { bairro: "Centro", periodo: "2025" }

    expect(comFiltros("/saude", filtros)).toBe(
      "/saude?bairro=Centro&periodo=2025"
    )
  })

  it("não põe Todos na URL e remove o filtro que já estava no link", () => {
    const filtros = { bairro: TODOS, periodo: "2025" }

    expect(comFiltros("/saude?bairro=Antigo", filtros)).toBe(
      "/saude?periodo=2025"
    )
  })

  it("preserva outros parâmetros e o fragmento", () => {
    const filtros = { bairro: "Centro", periodo: TODOS }

    expect(comFiltros("/obras?pagina=2#topo", filtros)).toBe(
      "/obras?pagina=2&bairro=Centro#topo"
    )
  })

  it("codifica o valor e volta igual ao ser lido", () => {
    const filtros = { bairro: "Cidade Nova & Cia", periodo: "2024/2025" }

    const link = comFiltros("/educacao", filtros)
    const lido = lerFiltros(new URL(link, "http://localhost").searchParams)

    expect(link).not.toContain("&Cia")
    expect(lido).toEqual(filtros)
  })

  it("devolve só o caminho quando não há filtro", () => {
    expect(comFiltros("/fontes", { bairro: TODOS, periodo: TODOS })).toBe(
      "/fontes"
    )
  })
})
