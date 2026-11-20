import { lerCsv } from "./ler-csv"

describe("lerCsv", () => {
  it("lê cabeçalho e linhas, ignorando o BOM e o fim de linha CRLF", () => {
    const texto = "﻿uv,bairro\r\n1,CENTRO\r\n2,PIRANHAS\r\n"

    expect(lerCsv(texto)).toEqual([
      { uv: "1", bairro: "CENTRO" },
      { uv: "2", bairro: "PIRANHAS" },
    ])
  })

  it("mantém vírgula, aspas escapadas e quebra de linha dentro de campo entre aspas", () => {
    const texto = 'nome,endereco\n"ESCOLA ""A""","RUA X, 10\nCENTRO"\n'

    expect(lerCsv(texto)).toEqual([
      { nome: 'ESCOLA "A"', endereco: "RUA X, 10\nCENTRO" },
    ])
  })

  it("preenche com texto vazio a coluna que falta e lê a última linha sem quebra final", () => {
    expect(lerCsv("a,b,c\n1,2")).toEqual([{ a: "1", b: "2", c: "" }])
  })

  it("devolve lista vazia para texto vazio e ignora linhas em branco", () => {
    expect(lerCsv("")).toEqual([])
    expect(lerCsv("a\n\n1\n\n")).toEqual([{ a: "1" }])
  })
})
