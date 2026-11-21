import {
  analisarTexto,
  BAIRROS,
  csv,
  lerTexto,
} from "@/lib/importacao/__fixtures__/analise"
import { analisarImportacao } from "@/lib/importacao/analisar-importacao"
import type {
  AnaliseImportacao,
  CodigoProblema,
} from "@/lib/importacao/tipos-importacao"

function problemasDe(analise: AnaliseImportacao, codigo: CodigoProblema) {
  return analise.problemas.filter((problema) => problema.codigo === codigo)
}

describe("analisarImportacao: mapeamento (TU-07)", () => {
  it("usa a sugestão quando nenhum mapeamento foi escolhido", () => {
    const analise = analisarTexto(csv("Centro,2025,9"))

    expect(analise.mapeamento).toEqual({ bairro: 0, periodo: 1, casos: 2 })
    expect(analise.podeConfirmar).toBe(true)
  })

  it.each(["bairro", "periodo", "casos"] as const)(
    "não pode confirmar com o campo %s sem coluna",
    (campo) => {
      const analise = analisarTexto(csv("Centro,2025,9"), {
        mapeamento: { bairro: 0, periodo: 1, casos: 2, [campo]: null },
      })

      expect(analise.podeConfirmar).toBe(false)
      expect(analise.linhasNormalizadas).toEqual([])
    }
  )

  it("não pode confirmar com duas colunas no mesmo campo e não lê nada", () => {
    const analise = analisarTexto(csv("Centro,2025,9"), {
      mapeamento: { bairro: 0, periodo: 1, casos: 1 },
    })

    expect(analise.podeConfirmar).toBe(false)
    expect(analise.nomes).toEqual([])
  })

  it("lista as colunas ignoradas e não as lê", () => {
    const analise = analisarTexto(
      "bairro,ano,casos,observacao\nCentro,2025,9,qualquer coisa"
    )

    expect(analise.colunasIgnoradas).toEqual(["observacao"])
    expect(analise.podeConfirmar).toBe(true)
  })

  it("uma troca de colunas reanalisa: período no lugar do bairro vira erro de linha", () => {
    const analise = analisarTexto(csv("Centro,2025,9"), {
      mapeamento: { bairro: 1, periodo: 0, casos: 2 },
    })

    expect(problemasDe(analise, "PERIODO_INVALIDO")).toHaveLength(1)
    expect(analise.podeConfirmar).toBe(false)
  })
})

describe("analisarImportacao: bairros e decisões (TU-09)", () => {
  const texto = csv(
    "Centro,2025,9",
    "Morada,2025,14",
    "Morada,2026,11",
    "Aranaú,2025,6",
    "Aranaú,2026,8"
  )

  it("nome ambíguo ou não reconhecido sem decisão bloqueia a confirmação", () => {
    const analise = analisarTexto(texto)

    expect(analise.pendencias).toBe(2)
    expect(analise.podeConfirmar).toBe(false)
    expect(
      analise.nomes.map(({ nomeNormalizado, destino }) => [
        nomeNormalizado,
        destino?.tipo ?? null,
      ])
    ).toEqual([
      ["centro", "bairro"],
      ["morada", null],
      ["aranau", null],
    ])
  })

  it("as decisões liberam e valem para todas as linhas do nome", () => {
    const analise = analisarTexto(texto, {
      decisoes: [
        { nomeNormalizado: "morada", tipo: "bairro", bairroId: "uv-20" },
        { nomeNormalizado: "aranau", tipo: "fora-da-cobertura" },
      ],
    })

    expect(analise.pendencias).toBe(0)
    expect(analise.podeConfirmar).toBe(true)
    expect(
      analise.linhasNormalizadas.map(({ linhaArquivo, bairroId }) => [
        linhaArquivo,
        bairroId,
      ])
    ).toEqual([
      [2, "uv-10"],
      [3, "uv-20"],
      [4, "uv-20"],
      [5, null],
      [6, null],
    ])
    expect(analise.resumo.foraDaCobertura).toBe(2)
  })

  it("decisão com bairro inexistente é ignorada e o nome continua pendente", () => {
    const analise = analisarTexto(texto, {
      decisoes: [
        { nomeNormalizado: "morada", tipo: "bairro", bairroId: "uv-99" },
        { nomeNormalizado: "aranau", tipo: "fora-da-cobertura" },
      ],
    })

    expect(analise.pendencias).toBe(1)
    expect(analise.podeConfirmar).toBe(false)
  })

  it("conta as linhas de cada nome distinto e guarda a grafia original da primeira", () => {
    const analise = analisarTexto(
      csv("  centro ,2025,1", "CENTRO,2026,2", "Rodagem,2025,3")
    )

    expect(analise.nomes[0]).toMatchObject({
      nomeOriginal: "  centro ",
      linhas: 2,
      decisao: null,
    })
  })

  it("linha fora da cobertura guarda o nome original como veio", () => {
    const analise = analisarTexto(csv("Aranaú,2025,6"), {
      decisoes: [{ nomeNormalizado: "aranau", tipo: "fora-da-cobertura" }],
    })

    expect(analise.linhasNormalizadas).toEqual([
      {
        linhaArquivo: 2,
        bairroId: null,
        nomeOriginal: "Aranaú",
        periodo: "2025",
        casos: 6,
      },
    ])
  })

  it("bairro vazio é erro de linha, não um nome a decidir", () => {
    const analise = analisarTexto(csv(",2025,9", "Centro,2025,4"))

    expect(problemasDe(analise, "BAIRRO_VAZIO")).toEqual([
      { linhas: [2], codigo: "BAIRRO_VAZIO", severidade: "erro" },
    ])
    expect(analise.nomes).toHaveLength(1)
    expect(analise.podeConfirmar).toBe(false)
  })
})

describe("analisarImportacao: erros de casos e período sem eco do valor (TU-10)", () => {
  it.each([
    ["-3", "CASOS_NEGATIVO", "Centro,2025,-3"],
    ["12,5", "CASOS_DECIMAL", 'Centro,2025,"12,5"'],
    ["abc", "CASOS_NAO_NUMERICO", "Centro,2025,abc"],
    ["2025-13", "PERIODO_INVALIDO", "Centro,2025-13,9"],
    ["25", "PERIODO_INVALIDO", "Centro,25,9"],
  ] as const)("erro por %s", (valor, codigo, linha) => {
    const analise = analisarTexto(csv(linha))

    expect(problemasDe(analise, codigo)).toEqual([
      { linhas: [2], codigo, severidade: "erro" },
    ])
    expect(analise.podeConfirmar).toBe(false)
    expect(JSON.stringify(analise.problemas)).not.toContain(valor)
  })

  it("granularidade mista: a linha que destoa da primeira é erro", () => {
    const analise = analisarTexto(
      csv("Centro,2025,9", "Rodagem,2025-03,4", "Piranhas,2026,1")
    )

    expect(problemasDe(analise, "GRANULARIDADE_MISTURADA")).toEqual([
      { linhas: [3], codigo: "GRANULARIDADE_MISTURADA", severidade: "erro" },
    ])
    expect(analise.granularidade).toBe("ano")
    expect(analise.periodos).toEqual(["2025", "2026"])
  })

  it("a granularidade vem da primeira linha com período válido, ainda que venha depois de uma inválida", () => {
    const analise = analisarTexto(csv("Centro,xx,9", "Rodagem,2025-03,4"))

    expect(analise.granularidade).toBe("mes")
    expect(analise.periodos).toEqual(["2025-03"])
  })

  it("sem nenhum período válido não há granularidade", () => {
    const analise = analisarTexto(csv("Centro,xx,9"))

    expect(analise.granularidade).toBeNull()
    expect(analise.periodos).toEqual([])
  })

  it("uma linha com dois problemas aparece uma vez em cada motivo e conta como uma linha com erro", () => {
    const analise = analisarTexto(csv("Centro,xx,abc", "Rodagem,2025,4"))

    expect(analise.problemas.map(({ codigo }) => codigo)).toEqual([
      "CASOS_NAO_NUMERICO",
      "PERIODO_INVALIDO",
    ])
    expect(analise.resumo).toMatchObject({ lidas: 2, comErro: 1, validas: 1 })
  })

  it("erros vêm antes de avisos e cada grupo segue a ordem das linhas", () => {
    const analise = analisarTexto(
      csv(
        "Centro,2025,",
        "Rodagem,2025,abc",
        "Piranhas,2025,",
        "Pedrinhas,xx,1"
      )
    )

    expect(
      analise.problemas.map(({ codigo, linhas }) => [codigo, linhas[0]])
    ).toEqual([
      ["CASOS_NAO_NUMERICO", 3],
      ["PERIODO_INVALIDO", 5],
      ["CASOS_VAZIO", 2],
      ["CASOS_VAZIO", 4],
    ])
  })
})

describe("analisarImportacao: casos vazio é sem dado (TU-11)", () => {
  it("vira aviso, vira null (nunca zero) e não bloqueia", () => {
    const analise = analisarTexto(csv("Centro,2025,", "Rodagem,2025,0"))

    expect(problemasDe(analise, "CASOS_VAZIO")).toEqual([
      { linhas: [2], codigo: "CASOS_VAZIO", severidade: "aviso" },
    ])
    expect(analise.linhasNormalizadas.map(({ casos }) => casos)).toEqual([
      null,
      0,
    ])
    expect(analise.podeConfirmar).toBe(true)
    expect(analise.resumo).toMatchObject({
      comAviso: 1,
      semDado: 1,
      comErro: 0,
    })
  })

  it("lê 1.234 como 1234", () => {
    const analise = analisarTexto(csv('Centro,2025,"1.234"'))

    expect(analise.linhasNormalizadas[0]?.casos).toBe(1234)
  })
})

describe("analisarImportacao: duplicatas (TU-12)", () => {
  it("Centro e CENTRO no mesmo ano geram DUPLICATA com as duas linhas e bloqueiam", () => {
    const analise = analisarTexto(csv("Centro,2025,9", "CENTRO,2025,4"))

    expect(problemasDe(analise, "DUPLICATA")).toEqual([
      { linhas: [2, 3], codigo: "DUPLICATA", severidade: "erro" },
    ])
    expect(analise.podeConfirmar).toBe(false)
    expect(analise.resumo.porMotivo.DUPLICATA).toBe(2)
  })

  it("o mesmo bairro em períodos diferentes não é duplicata", () => {
    const analise = analisarTexto(csv("Centro,2025,9", "CENTRO,2026,4"))

    expect(problemasDe(analise, "DUPLICATA")).toEqual([])
  })

  it("dois nomes que resolvem para o mesmo bairro depois da decisão também duplicam", () => {
    const analise = analisarTexto(csv("Morada,2025,1", "Morada Nova,2025,2"), {
      decisoes: [
        { nomeNormalizado: "morada", tipo: "bairro", bairroId: "uv-21" },
      ],
    })

    expect(problemasDe(analise, "DUPLICATA")[0]?.linhas).toEqual([2, 3])
  })

  it("nome pendente ainda não entra na checagem de duplicata", () => {
    const analise = analisarTexto(csv("Morada,2025,1", "Morada Nova,2025,2"))

    expect(problemasDe(analise, "DUPLICATA")).toEqual([])
    expect(analise.pendencias).toBe(1)
  })

  it("dois fora da cobertura de mesmo nome e período duplicam pelo nome normalizado", () => {
    const analise = analisarTexto(
      csv("Aranaú,2025,6", "ARANAU,2025,3", "Coité,2025,2"),
      {
        decisoes: [
          { nomeNormalizado: "aranau", tipo: "fora-da-cobertura" },
          { nomeNormalizado: "coite", tipo: "fora-da-cobertura" },
        ],
      }
    )

    expect(problemasDe(analise, "DUPLICATA")).toEqual([
      { linhas: [2, 3], codigo: "DUPLICATA", severidade: "erro" },
    ])
  })

  it("três linhas na mesma chave viram uma duplicata com as três", () => {
    const analise = analisarTexto(
      csv("Centro,2025,1", "centro,2025,2", " CENTRO ,2025,3")
    )

    expect(problemasDe(analise, "DUPLICATA")).toEqual([
      { linhas: [2, 3, 4], codigo: "DUPLICATA", severidade: "erro" },
    ])
  })
})

describe("analisarImportacao: resumo e desempenho", () => {
  it("resume lidas, válidas, avisos, erros, sem dado e fora da cobertura", () => {
    const analise = analisarTexto(
      csv("Centro,2025,9", "Rodagem,2025,", "Piranhas,xx,1", "Aranaú,2025,3"),
      { decisoes: [{ nomeNormalizado: "aranau", tipo: "fora-da-cobertura" }] }
    )

    expect(analise.resumo).toEqual({
      lidas: 4,
      validas: 3,
      comAviso: 1,
      comErro: 1,
      semDado: 1,
      foraDaCobertura: 1,
      porMotivo: {
        PERIODO_INVALIDO: 1,
        GRANULARIDADE_MISTURADA: 0,
        CASOS_NEGATIVO: 0,
        CASOS_DECIMAL: 0,
        CASOS_NAO_NUMERICO: 0,
        CASOS_VAZIO: 1,
        BAIRRO_VAZIO: 0,
        DUPLICATA: 0,
      },
    })
    expect(
      analise.linhasNormalizadas.map(({ linhaArquivo }) => linhaArquivo)
    ).toEqual([2, 3, 5])
  })

  it("marca a análise para a medição de desempenho no navegador", () => {
    const marcar = jest.spyOn(performance, "mark")

    analisarTexto(csv("Centro,2025,9"))

    expect(marcar).toHaveBeenCalledWith("importacao:analise")
  })

  it("não falha onde a plataforma não tem performance.mark", () => {
    const original = performance.mark
    Object.assign(performance, { mark: undefined })
    try {
      expect(analisarTexto(csv("Centro,2025,9")).podeConfirmar).toBe(true)
    } finally {
      Object.assign(performance, { mark: original })
    }
  })

  it("analisa 10.000 linhas de nomes distintos em tempo razoável", () => {
    const linhas = Array.from(
      { length: 10_000 },
      (_, indice) => `Localidade ${indice},2025,1`
    )
    const arquivo = lerTexto(csv(...linhas))

    const inicio = performance.now()
    const analise = analisarImportacao({
      arquivo,
      mapeamento: null,
      decisoes: [],
      bairros: BAIRROS,
    })
    const duracaoMs = performance.now() - inicio

    expect(analise.pendencias).toBe(10_000)
    // Folga larga: o alvo de RNF-02.01 é a importação inteira; aqui só se pega regressão de ordem de grandeza.
    expect(duracaoMs).toBeLessThan(5_000)
  })
})
