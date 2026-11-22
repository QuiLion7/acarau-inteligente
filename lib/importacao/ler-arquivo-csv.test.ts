import {
  BYTES_PNG,
  bytesLatin1,
  bytesUtf8,
  csvComLinhas,
  csvComTamanho,
  csvNoLimiteDeTamanho,
  ROTEIRO_PONTO_E_VIRGULA,
} from "@/lib/importacao/__fixtures__/csv-bytes"
import { lerArquivoCsv } from "@/lib/importacao/ler-arquivo-csv"
import { LINHAS_MAXIMAS, TAMANHO_MAXIMO_BYTES } from "@/lib/importacao/limites"
import type { ResultadoLeitura } from "@/lib/importacao/tipos-importacao"

function ler(
  texto: string,
  {
    nome = "casos.csv",
    bom = false,
    separador,
  }: {
    nome?: string
    bom?: boolean
    separador?: "," | ";"
  } = {}
): ResultadoLeitura {
  return lerArquivoCsv({ nome, bytes: bytesUtf8(texto, { bom }), separador })
}

function arquivoLido(resultado: ResultadoLeitura) {
  if (resultado.status !== "lido") {
    throw new Error(`esperava arquivo lido, veio ${resultado.motivo}`)
  }
  return resultado.arquivo
}

describe("lerArquivoCsv: leitura (TU-01)", () => {
  it("lê CSV com ponto e vírgula e BOM, preserva acentos e detecta o separador", () => {
    const resultado = lerArquivoCsv({
      nome: "roteiro.csv",
      bytes: bytesUtf8(ROTEIRO_PONTO_E_VIRGULA, { bom: true }),
    })

    expect(arquivoLido(resultado)).toMatchObject({
      nome: "roteiro.csv",
      encoding: "UTF-8 com BOM",
      separador: ";",
      separadorDetectado: ";",
      cabecalho: ["bairro", "ano", "casos"],
      linhas: [
        { numero: 2, celulas: ["Centro", "2025", "12"] },
        { numero: 3, celulas: ["São Benedito", "2025", "7"] },
      ],
    })
  })

  it("sem BOM o encoding é UTF-8 e o separador padrão é a vírgula", () => {
    const arquivo = arquivoLido(ler("bairro,ano,casos\nCentro,2025,9"))

    expect(arquivo).toMatchObject({
      encoding: "UTF-8",
      separador: ",",
      tamanhoBytes: bytesUtf8("bairro,ano,casos\nCentro,2025,9").length,
    })
  })

  it("separador forçado vale, e o detectado continua informado para a prévia", () => {
    const arquivo = arquivoLido(
      ler("bairro;ano;casos\nCentro;2025;9", { separador: "," })
    )

    expect(arquivo.separador).toBe(",")
    expect(arquivo.separadorDetectado).toBe(";")
    expect(arquivo.cabecalho).toEqual(["bairro;ano;casos"])
  })

  it("ignora linhas em branco e mantém o número da linha do arquivo", () => {
    const arquivo = arquivoLido(
      ler("bairro,ano,casos\n\nCentro,2025,9\n   \nRodagem,2025,4\n\n")
    )

    expect(arquivo.linhas.map(({ numero }) => numero)).toEqual([3, 5])
  })

  it("aceita aspas com separador, aspas duplicadas e quebra de linha dentro da célula", () => {
    const arquivo = arquivoLido(
      ler(
        'bairro,ano,casos\n"Centro, norte",2025,"1"\n"Dois\nlinhas ""x""",2025,2\nRodagem,2025,3'
      )
    )

    expect(arquivo.linhas).toEqual([
      { numero: 2, celulas: ["Centro, norte", "2025", "1"] },
      { numero: 3, celulas: ['Dois\nlinhas "x"', "2025", "2"] },
      { numero: 5, celulas: ["Rodagem", "2025", "3"] },
    ])
  })

  it("aceita quebras CRLF e CR sozinho", () => {
    const comCrlf = arquivoLido(ler("bairro,ano,casos\r\nCentro,2025,9\r\n"))
    const comCr = arquivoLido(
      ler("bairro,ano,casos\rCentro,2025,9\rRodagem,2025,4")
    )

    expect(comCrlf.linhas).toHaveLength(1)
    expect(comCr.linhas.map(({ numero }) => numero)).toEqual([2, 3])
  })

  it("o cabeçalho pode vir depois de linhas em branco e a numeração segue o arquivo", () => {
    const arquivo = arquivoLido(ler("\n\nbairro,ano,casos\nCentro,2025,9"))

    expect(arquivo.cabecalho).toEqual(["bairro", "ano", "casos"])
    expect(arquivo.linhas[0]?.numero).toBe(4)
  })
})

describe("lerArquivoCsv: limites (TU-02)", () => {
  it.each([
    [
      "4 MB mais um byte",
      () => ({ nome: "a.csv", bytes: csvComTamanho(TAMANHO_MAXIMO_BYTES + 1) }),
      "ARQUIVO_GRANDE_DEMAIS",
    ],
    [
      "10.001 linhas de dados",
      () => ({
        nome: "a.csv",
        bytes: bytesUtf8(csvComLinhas(LINHAS_MAXIMAS + 1)),
      }),
      "LINHAS_DEMAIS",
    ],
    [
      "extensão .txt",
      () => ({
        nome: "casos.txt",
        bytes: bytesUtf8("bairro,ano,casos\nCentro,2025,9"),
      }),
      "EXTENSAO_INVALIDA",
    ],
    [
      "imagem com nome .csv",
      () => ({ nome: "foto.csv", bytes: BYTES_PNG }),
      "ARQUIVO_NAO_TEXTO",
    ],
  ])("recusa %s", (_, montar, motivo) => {
    expect(lerArquivoCsv(montar())).toMatchObject({
      status: "recusado",
      motivo,
    })
  })

  it("a recusa por 10.001 linhas aponta a linha 10.002 do arquivo", () => {
    const resultado = lerArquivoCsv({
      nome: "a.csv",
      bytes: bytesUtf8(csvComLinhas(LINHAS_MAXIMAS + 1)),
    })

    expect(resultado).toMatchObject({
      motivo: "LINHAS_DEMAIS",
      linha: LINHAS_MAXIMAS + 2,
    })
  })

  it("aceita exatamente 4 MB e exatamente 10.000 linhas", () => {
    const noLimiteDeBytes = lerArquivoCsv({
      nome: "a.csv",
      bytes: csvNoLimiteDeTamanho(),
    })
    const noLimiteDeLinhas = lerArquivoCsv({
      nome: "a.csv",
      bytes: bytesUtf8(csvComLinhas(LINHAS_MAXIMAS)),
    })

    expect(noLimiteDeBytes.status).toBe("lido")
    expect(arquivoLido(noLimiteDeLinhas).linhas).toHaveLength(LINHAS_MAXIMAS)
  })

  it("recusa byte NUL em qualquer ponto do arquivo, não só no começo", () => {
    const comNulNoFim = bytesUtf8(`${csvComLinhas(2000)}\n`)
    comNulNoFim[comNulNoFim.length - 3] = 0

    expect(lerArquivoCsv({ nome: "a.csv", bytes: comNulNoFim })).toEqual({
      status: "recusado",
      motivo: "ARQUIVO_NAO_TEXTO",
    })
  })

  it("a extensão não diferencia maiúsculas de minúsculas", () => {
    expect(
      ler("bairro,ano,casos\nCentro,2025,9", { nome: "CASOS.CSV" }).status
    ).toBe("lido")
  })
})

describe("lerArquivoCsv: encoding (TU-03)", () => {
  it("recusa Latin-1 com acento pedindo UTF-8", () => {
    const resultado = lerArquivoCsv({
      nome: "a.csv",
      bytes: bytesLatin1("bairro,ano,casos\nSão Benedito,2025,9"),
    })

    expect(resultado).toEqual({
      status: "recusado",
      motivo: "ENCODING_INVALIDO",
    })
  })

  it("Latin-1 só com letras sem acento é texto válido nos dois encodings", () => {
    expect(
      lerArquivoCsv({
        nome: "a.csv",
        bytes: bytesLatin1("bairro,ano,casos\nCentro,2025,9"),
      }).status
    ).toBe("lido")
  })
})

describe("lerArquivoCsv: malformado (TU-04)", () => {
  it.each([
    [
      "sem cabeçalho (primeira linha é dado)",
      "Centro,2025,9\nRodagem,2025,4",
      "SEM_CABECALHO",
      1,
    ],
    ["arquivo vazio", "", "SEM_CABECALHO", 1],
    ["só linhas em branco", "\n\n  \n", "SEM_CABECALHO", 1],
    [
      "cabeçalho com célula vazia",
      "bairro,,casos\nCentro,2025,9",
      "SEM_CABECALHO",
      1,
    ],
    [
      "cabeçalho com coluna repetida",
      "bairro,ano,Ano\nCentro,2025,9",
      "SEM_CABECALHO",
      1,
    ],
    ["0 linhas de dados", "bairro,ano,casos\n", "SEM_LINHAS", 1],
    [
      "0 linhas de dados com linhas em branco",
      "bairro,ano,casos\n\n\n",
      "SEM_LINHAS",
      1,
    ],
    [
      "coluna a mais",
      "bairro,ano,casos\nCentro,2025,9\nRodagem,2025,4,7",
      "COLUNAS_DIVERGENTES",
      3,
    ],
    [
      "coluna a menos",
      "bairro,ano,casos\nCentro,2025",
      "COLUNAS_DIVERGENTES",
      2,
    ],
    [
      "aspas não fechadas",
      'bairro,ano,casos\nCentro,2025,9\n"Rodagem,2025,4\nOutro,2025,1',
      "ASPAS_NAO_FECHADAS",
      3,
    ],
    [
      "aspas mal fechadas",
      'bairro,ano,casos\n"Centro"x,2025,9',
      "ASPAS_NAO_FECHADAS",
      2,
    ],
    [
      "aspas não fechadas no cabeçalho",
      'bairro,"ano,casos\nCentro,2025,9',
      "ASPAS_NAO_FECHADAS",
      1,
    ],
    [
      "separador misto (cabeçalho com ; e linha com ,)",
      "bairro;ano;casos\nCentro;2025;9\nRodagem,2025,4",
      "SEPARADOR_MISTO",
      3,
    ],
    [
      "separador misto (cabeçalho com , e linha com ;)",
      "bairro,ano,casos\nCentro;2025;9",
      "SEPARADOR_MISTO",
      2,
    ],
  ])("recusa %s com motivo e linha", (_, texto, motivo, linha) => {
    const resultado = ler(texto)

    expect(resultado).toMatchObject({ status: "recusado", motivo })
    expect(resultado.status === "recusado" ? resultado.linha : null).toBe(linha)
  })

  it("a recusa nunca traz o conteúdo de uma célula", () => {
    const resultado = ler("bairro,ano,casos\nSegredoNaCelula,2025,9,extra")

    expect(JSON.stringify(resultado)).not.toContain("SegredoNaCelula")
  })
})

describe("lerArquivoCsv: escape de fórmula (TU-05)", () => {
  it("desfaz o escape das cinco formas e mantém o resto como texto", () => {
    const arquivo = arquivoLido(
      ler(
        [
          "bairro,ano,casos",
          "'=SOMA(A1),'+1,'-2",
          "'@x,\"'\t1\",'abc",
          "<b>x</b>,'',a'b",
        ].join("\n")
      )
    )

    expect(arquivo.linhas.map(({ celulas }) => celulas)).toEqual([
      ["=SOMA(A1)", "+1", "-2"],
      ["@x", "\t1", "'abc"],
      ["<b>x</b>", "''", "a'b"],
    ])
  })

  it("o escape do cabeçalho também é desfeito", () => {
    const arquivo = arquivoLido(ler("'=bairro,ano,casos\nCentro,2025,9"))

    expect(arquivo.cabecalho[0]).toBe("=bairro")
  })
})

describe("lerArquivoCsv: dado pessoal (TU-13)", () => {
  it.each([
    ["nome_paciente"],
    ["cpf"],
    ["CPF do responsável"],
    ["Cartão SUS"],
    ["data_nascimento"],
    ["Endereço"],
    ["telefone"],
    ["latitude"],
    ["nome"],
  ])("recusa a coluna %s citando o nome da coluna", (coluna) => {
    const resultado = ler(`bairro,${coluna},casos\nCentro,2025,9`)

    expect(resultado).toEqual({
      status: "recusado",
      motivo: "DADO_PESSOAL_COLUNA",
      coluna,
    })
  })

  it("recusa CPF formatado em célula citando a linha e não o valor", () => {
    const resultado = ler(
      "bairro,ano,casos\nCentro,2025,9\nRodagem,2025,123.456.789-09"
    )

    expect(resultado).toEqual({
      status: "recusado",
      motivo: "DADO_PESSOAL_VALOR",
      linha: 3,
    })
    expect(JSON.stringify(resultado)).not.toContain("123.456")
  })

  it("aceita nome_bairro e a sigla SUS sozinha", () => {
    expect(ler("nome_bairro,ano,casos\nCentro,2025,9").status).toBe("lido")
    expect(ler("bairro,ano,casos_sus\nCentro,2025,9").status).toBe("lido")
  })

  it("número parecido com CPF mas sem a formatação não é recusado", () => {
    expect(ler("bairro,ano,casos\nCentro,2025,12345678909").status).toBe("lido")
  })
})
