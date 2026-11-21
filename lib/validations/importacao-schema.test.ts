import { confirmarImportacaoSchema } from "@/lib/validations/importacao-schema"

const VALIDO = {
  separador: ";",
  mapeamento: { bairro: 0, periodo: 1, casos: 2 },
  decisoes: [
    { nomeNormalizado: "morada", tipo: "bairro", bairroId: "uv-14" },
    { nomeNormalizado: "aranau", tipo: "fora-da-cobertura" },
  ],
  metadados: {
    nome: "Roteiro 2025-2026",
    indicador: "Casos notificados (sintético)",
    fonte: "Planilha de roteiro",
  },
  destino: { tipo: "novo" },
}

function camposInvalidos(entrada: unknown): string[] {
  const resultado = confirmarImportacaoSchema.safeParse(entrada)
  if (resultado.success) return []
  return resultado.error.issues.map(({ path }) => path.join("."))
}

describe("confirmarImportacaoSchema", () => {
  it("aceita o exemplo da TechSpec", () => {
    expect(confirmarImportacaoSchema.safeParse(VALIDO).success).toBe(true)
  })

  it("aparou os metadados e aceita destino de nova versão com um uuid", () => {
    const resultado = confirmarImportacaoSchema.parse({
      ...VALIDO,
      metadados: {
        nome: "  Roteiro  ",
        indicador: " Casos ",
        fonte: " Fonte ",
      },
      destino: {
        tipo: "nova-versao",
        datasetId: "7d0c2b8e-1f3a-4c55-9a0e-2d5b8f7c4e10",
      },
    })

    expect(resultado.metadados).toEqual({
      nome: "Roteiro",
      indicador: "Casos",
      fonte: "Fonte",
    })
    expect(resultado.destino.tipo).toBe("nova-versao")
  })

  it.each([
    ["separador fora de , e ;", { ...VALIDO, separador: "|" }, "separador"],
    [
      "coluna negativa",
      { ...VALIDO, mapeamento: { bairro: -1, periodo: 1, casos: 2 } },
      "mapeamento.bairro",
    ],
    [
      "coluna decimal",
      { ...VALIDO, mapeamento: { bairro: 0.5, periodo: 1, casos: 2 } },
      "mapeamento.bairro",
    ],
    [
      "duas colunas iguais",
      { ...VALIDO, mapeamento: { bairro: 0, periodo: 0, casos: 2 } },
      "mapeamento",
    ],
    [
      "bairro fora do formato uv-NN",
      {
        ...VALIDO,
        decisoes: [{ nomeNormalizado: "x", tipo: "bairro", bairroId: "uv-1" }],
      },
      "decisoes.0.bairroId",
    ],
    [
      "decisão sem nome",
      {
        ...VALIDO,
        decisoes: [{ nomeNormalizado: "", tipo: "fora-da-cobertura" }],
      },
      "decisoes.0.nomeNormalizado",
    ],
    [
      "tipo de decisão desconhecido",
      { ...VALIDO, decisoes: [{ nomeNormalizado: "x", tipo: "talvez" }] },
      "decisoes.0.tipo",
    ],
    [
      "nome curto demais",
      { ...VALIDO, metadados: { ...VALIDO.metadados, nome: "ab" } },
      "metadados.nome",
    ],
    [
      "nome só com espaços",
      { ...VALIDO, metadados: { ...VALIDO.metadados, nome: "     " } },
      "metadados.nome",
    ],
    [
      "indicador longo demais",
      {
        ...VALIDO,
        metadados: { ...VALIDO.metadados, indicador: "x".repeat(81) },
      },
      "metadados.indicador",
    ],
    [
      "fonte longa demais",
      { ...VALIDO, metadados: { ...VALIDO.metadados, fonte: "x".repeat(161) } },
      "metadados.fonte",
    ],
    [
      "nova versão sem uuid",
      { ...VALIDO, destino: { tipo: "nova-versao", datasetId: "abc" } },
      "destino.datasetId",
    ],
    [
      "destino desconhecido",
      { ...VALIDO, destino: { tipo: "outro" } },
      "destino.tipo",
    ],
    ["sem mapeamento", { ...VALIDO, mapeamento: undefined }, "mapeamento"],
  ])("recusa %s", (_, entrada, campo) => {
    expect(camposInvalidos(entrada)).toContain(campo)
  })

  it("aceita 10.000 decisões e recusa 10.001", () => {
    const decisoes = (quantidade: number) =>
      Array.from({ length: quantidade }, (_, i) => ({
        nomeNormalizado: `nome ${i}`,
        tipo: "fora-da-cobertura",
      }))

    expect(
      confirmarImportacaoSchema.safeParse({
        ...VALIDO,
        decisoes: decisoes(10_000),
      }).success
    ).toBe(true)
    expect(
      camposInvalidos({ ...VALIDO, decisoes: decisoes(10_001) })
    ).toContain("decisoes")
  })

  it("aceita o limite exato de 80 e 160 caracteres", () => {
    const resultado = confirmarImportacaoSchema.safeParse({
      ...VALIDO,
      metadados: {
        nome: "n".repeat(80),
        indicador: "i".repeat(80),
        fonte: "f".repeat(160),
      },
    })

    expect(resultado.success).toBe(true)
  })

  it.each([
    ["nome", "ab", "O nome do dataset deve ter no mínimo 3 caracteres."],
    ["indicador", "ab", "O indicador deve ter no mínimo 3 caracteres."],
    ["fonte", "f".repeat(161), "A fonte deve ter no máximo 160 caracteres."],
  ])(
    "a mensagem do campo %s começa com maiúscula, como a exibe o formulário",
    (campo, valor, mensagem) => {
      const resultado = confirmarImportacaoSchema.safeParse({
        ...VALIDO,
        metadados: { ...VALIDO.metadados, [campo]: valor },
      })

      expect(resultado.error?.issues.map(({ message }) => message)).toEqual([
        mensagem,
      ])
    }
  )
})
