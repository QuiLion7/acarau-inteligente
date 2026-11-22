import { LINHAS_MAXIMAS } from "@/lib/importacao/limites"
import {
  MENSAGEM_DO_PROBLEMA,
  mensagemDaRecusa,
  rotuloDasLinhas,
} from "@/lib/importacao/mensagens"
import type { MotivoRecusa } from "@/lib/importacao/tipos-importacao"

describe("mensagemDaRecusa", () => {
  it.each<[MotivoRecusa, number | undefined, RegExp]>([
    ["EXTENSAO_INVALIDA", undefined, /extensão \.csv/],
    ["ARQUIVO_GRANDE_DEMAIS", undefined, /4 MB/],
    ["ARQUIVO_NAO_TEXTO", undefined, /não é texto/],
    ["ENCODING_INVALIDO", undefined, /UTF-8/],
    ["SEM_CABECALHO", 1, /a linha 1 deveria ser o cabeçalho/],
    ["SEM_LINHAS", 1, /nenhuma linha de dados/],
    ["LINHAS_DEMAIS", 10002, /10\.000 linhas.*linha 10002/],
    ["ASPAS_NAO_FECHADAS", 3, /a linha 3 tem aspas/],
    ["SEPARADOR_MISTO", 3, /a linha 3 usa outro separador/],
    ["COLUNAS_DIVERGENTES", 2, /a linha 2 tem um número de colunas/],
  ])("%s diz o limite ou a linha do problema", (motivo, linha, esperado) => {
    expect(mensagemDaRecusa({ motivo, linha })).toMatch(esperado)
  })

  it("dado pessoal em coluna cita a coluna e o limite da demonstração", () => {
    expect(
      mensagemDaRecusa({
        motivo: "DADO_PESSOAL_COLUNA",
        coluna: "nome_paciente",
      })
    ).toBe(
      "Arquivo recusado: a coluna nome_paciente parece conter dado pessoal. A demonstração aceita só contagens agregadas por bairro e período."
    )
  })

  it("dado pessoal em célula cita a linha, sem valor", () => {
    expect(mensagemDaRecusa({ motivo: "DADO_PESSOAL_VALOR", linha: 7 })).toBe(
      "Arquivo recusado: a linha 7 tem um valor no formato de CPF. A demonstração aceita só contagens agregadas por bairro e período."
    )
  })

  it("sem linha informada fala do arquivo", () => {
    expect(mensagemDaRecusa({ motivo: "COLUNAS_DIVERGENTES" })).toContain(
      "o arquivo tem um número de colunas"
    )
  })

  it("o limite de linhas da mensagem é o do motor", () => {
    expect(mensagemDaRecusa({ motivo: "LINHAS_DEMAIS", linha: 1 })).toContain(
      LINHAS_MAXIMAS.toLocaleString("pt-BR")
    )
  })
})

describe("textos sem travessão nem meia-risca (react-next.md §13)", () => {
  it("as mensagens por problema não usam travessão", () => {
    for (const texto of Object.values(MENSAGEM_DO_PROBLEMA)) {
      expect(texto).not.toMatch(/[—–]/)
    }
  })
})

describe("rotuloDasLinhas", () => {
  it.each([
    [[3], "Linha 3"],
    [[2, 3], "Linhas 2 e 3"],
    [[2, 3, 4], "Linhas 2, 3 e 4"],
    [[2, 3, 4, 5, 6], "Linhas 2, 3, 4, 5 e 6"],
    [[2, 3, 4, 5, 6, 7, 8], "Linhas 2, 3, 4, 5, 6 e mais 2"],
  ])("%j vira %j", (linhas, esperado) => {
    expect(rotuloDasLinhas(linhas)).toBe(esperado)
  })
})
