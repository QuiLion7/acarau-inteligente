import type { BairroResumo } from "./artefato-schema"
import { buscarBairros } from "./busca-bairros"

const BAIRROS: BairroResumo[] = [
  { id: "uv-03", uv: 3, nome: "São Benedito", nomeLei: "SÃO BENEDITO" },
  { id: "uv-10", uv: 10, nome: "Centro", nomeLei: "CENTRO" },
  { id: "uv-13", uv: 13, nome: "Rodagem", nomeLei: "RODAGEM" },
  { id: "uv-23", uv: 23, nome: "Cerâmica", nomeLei: "CERÂMICA" },
]

const nomes = (termo: string) =>
  buscarBairros(BAIRROS, termo).map((bairro) => bairro.nome)

describe("buscarBairros", () => {
  it.each([
    ["sao  benedito"],
    ["SÃO BENEDITO"],
    ["  Sao Benedito  "],
    ["benedi"],
  ])(
    "acha São Benedito por %j, ignorando acento, caixa e espaços extras",
    (termo) => {
      expect(nomes(termo)).toEqual(["São Benedito"])
    }
  )

  it.each([["3"], ["03"], ["uv 3"], ["UV-03"], ["uv03"]])(
    "acha São Benedito pelo código da UV em %j",
    (termo) => {
      expect(nomes(termo)).toEqual(["São Benedito"])
    }
  )

  it("não confunde o código 3 com as UVs 13 e 23", () => {
    expect(nomes("3")).not.toContain("Rodagem")
    expect(nomes("3")).not.toContain("Cerâmica")
  })

  it("devolve lista vazia para bairro que não existe, sem sugerir parecido", () => {
    expect(nomes("Aranaú")).toEqual([])
    expect(nomes("99")).toEqual([])
  })

  it("devolve todos para termo vazio ou só espaços", () => {
    expect(nomes("")).toHaveLength(4)
    expect(nomes("   ")).toHaveLength(4)
  })

  it("acha pelo nome da lei sem acento e não altera a lista recebida", () => {
    const copia = structuredClone(BAIRROS)

    expect(nomes("ceramica")).toEqual(["Cerâmica"])
    expect(BAIRROS).toEqual(copia)
  })
})
