import territorioGerado from "@/dados/gerados/territorio.json"
import {
  ArtefatoTerritorioInvalidoErro,
  criarRepositorioTerritorio,
  listarResumoBairros,
  obterDadosMapaResumo,
  obterDadosTerritorio,
  resolverIdBairro,
} from "@/lib/server/territorio/territorio-repositorio"

describe("territorio-repositorio (artefato versionado)", () => {
  it("lista os 24 bairros em ordem de UV, sem geometria", () => {
    const resumos = listarResumoBairros()

    expect(resumos).toHaveLength(24)
    expect(resumos.map((r) => r.uv)).toEqual(
      Array.from({ length: 24 }, (_, i) => i + 1)
    )
    expect(resumos[9]).toEqual({
      id: "uv-10",
      uv: 10,
      nome: "Centro",
      nomeLei: "CENTRO",
    })
  })

  it("expõe o Centro com 8 escolas e soma bairros + fora da cobertura = 58", () => {
    const { bairros, escolas, qualidade } = obterDadosTerritorio()

    const centro = bairros.find((b) => b.id === "uv-10")
    const somaDosBairros = bairros.reduce((soma, b) => soma + b.totalEscolas, 0)

    expect(centro?.totalEscolas).toBe(8)
    expect(escolas.filter((e) => e.bairroId === "uv-10")).toHaveLength(8)
    expect(somaDosBairros + qualidade.foraDaCobertura).toBe(58)
    expect(qualidade).toMatchObject({
      totalCatalogo: 62,
      comLocalizacao: 58,
      semLocalizacao: 4,
      foraDoLimite: 1,
    })
  })

  it("entrega ao mapa resumo os bairros e o limite, sem escolas", () => {
    const dados = obterDadosMapaResumo()

    expect(dados.bairros).toHaveLength(24)
    expect(dados.limite.nome).toBe("Acaraú")
    expect(dados).not.toHaveProperty("escolas")
  })

  it("resolve só IDs de bairro que existem no artefato", () => {
    expect(resolverIdBairro("uv-03")).toMatchObject({ nome: "São Benedito" })
    expect(resolverIdBairro("uv-99")).toBeNull()
    expect(resolverIdBairro("Centro")).toBeNull()
    expect(resolverIdBairro("")).toBeNull()
  })
})

describe("criarRepositorioTerritorio", () => {
  it("lança erro nomeado, com a causa, quando o artefato não confere com o schema", () => {
    const semBairros = { ...territorioGerado, bairros: "vazio" }

    expect(() => criarRepositorioTerritorio(semBairros)).toThrow(
      ArtefatoTerritorioInvalidoErro
    )
    try {
      criarRepositorioTerritorio(semBairros)
    } catch (erro) {
      expect(erro).toBeInstanceOf(ArtefatoTerritorioInvalidoErro)
      expect((erro as Error).cause).toBeDefined()
    }
  })

  it.each([[null], [{}], ["texto"]])("recusa artefato %j", (bruto) => {
    expect(() => criarRepositorioTerritorio(bruto)).toThrow(
      ArtefatoTerritorioInvalidoErro
    )
  })

  it("recusa campo desconhecido no artefato (formato mudou sem a carga ser refeita)", () => {
    expect(() =>
      criarRepositorioTerritorio({ ...territorioGerado, campoNovo: 1 })
    ).toThrow(ArtefatoTerritorioInvalidoErro)
  })
})
