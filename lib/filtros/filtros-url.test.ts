import {
  comFiltros,
  lerFiltros,
  resolverBairro,
  TODOS,
} from "@/lib/filtros/filtros-url"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"

function parametros(consulta: string): URLSearchParams {
  return new URLSearchParams(consulta)
}

describe("lerFiltros", () => {
  it("lê bairro e período da URL", () => {
    expect(lerFiltros(parametros("bairro=uv-10&periodo=2025"))).toEqual({
      bairro: "uv-10",
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
    expect(lerFiltros(parametros("bairro=%20uv-10%20")).bairro).toBe("uv-10")
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
    expect(lerFiltros(parametros("x=1&bairro=uv-10")).periodo).toBe(TODOS)
  })
})

describe("comFiltros", () => {
  it("reaplica bairro e período ao link", () => {
    const filtros = { bairro: "uv-10", periodo: "2025" }

    expect(comFiltros("/saude", filtros)).toBe(
      "/saude?bairro=uv-10&periodo=2025"
    )
  })

  it("não põe Todos na URL e remove o filtro que já estava no link", () => {
    const filtros = { bairro: TODOS, periodo: "2025" }

    expect(comFiltros("/saude?bairro=Antigo", filtros)).toBe(
      "/saude?periodo=2025"
    )
  })

  it("preserva outros parâmetros e o fragmento", () => {
    const filtros = { bairro: "uv-10", periodo: TODOS }

    expect(comFiltros("/obras?pagina=2#topo", filtros)).toBe(
      "/obras?pagina=2&bairro=uv-10#topo"
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

describe("resolverBairro", () => {
  const BAIRROS: BairroResumo[] = [
    { id: "uv-03", uv: 3, nome: "São Benedito", nomeLei: "SÃO BENEDITO" },
    { id: "uv-10", uv: 10, nome: "Centro", nomeLei: "CENTRO" },
  ]
  const resolver = (bairro: string) =>
    resolverBairro({ bairro, periodo: TODOS }, BAIRROS)

  it("resolve Todos como seleção de todos os bairros", () => {
    expect(resolver(TODOS)).toEqual({ tipo: "todos" })
  })

  it("resolve o ID de um bairro carregado", () => {
    expect(resolver("uv-10")).toEqual({ tipo: "bairro", bairro: BAIRROS[1] })
  })

  it.each([
    ["nome do bairro", "Centro"],
    ["ID inexistente", "uv-99"],
    ["ID sem zero à esquerda", "uv-3"],
    ["caixa diferente", "UV-10"],
    ["HTML", "<script>alert(1)</script>"],
    ["texto longo", "a".repeat(80)],
  ])("não reconhece %s", (_caso, valor) => {
    expect(resolver(valor)).toEqual({ tipo: "nao-reconhecido" })
  })

  it("não reconhece nada quando não há bairro carregado", () => {
    expect(resolverBairro({ bairro: "uv-10", periodo: TODOS }, [])).toEqual({
      tipo: "nao-reconhecido",
    })
  })

  it("ignora o período ao resolver o bairro", () => {
    expect(
      resolverBairro({ bairro: "uv-03", periodo: "2025" }, BAIRROS)
    ).toMatchObject({ tipo: "bairro" })
  })
})
