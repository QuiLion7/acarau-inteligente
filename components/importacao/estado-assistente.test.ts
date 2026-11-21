import {
  ESTADO_INICIAL,
  reduzirAssistente,
  type EstadoAssistente,
} from "@/components/importacao/estado-assistente"

const ENTRADA = { nome: "casos.csv", bytes: new Uint8Array([1]), hash: null }
const COM_ESCOLHAS: EstadoAssistente = {
  passo: "bairros",
  entrada: ENTRADA,
  separador: ";",
  mapeamento: { bairro: 0, periodo: 1, casos: 2 },
  decisoes: [{ nomeNormalizado: "morada", tipo: "fora-da-cobertura" }],
  interagiu: true,
}

describe("reduzirAssistente", () => {
  it("começa no envio, sem arquivo, escolha nem foco forçado", () => {
    expect(ESTADO_INICIAL).toEqual({
      passo: "envio",
      entrada: null,
      separador: undefined,
      mapeamento: null,
      decisoes: [],
      interagiu: false,
    })
  })

  it("escolher um arquivo vai às colunas e descarta tudo do arquivo anterior", () => {
    const proximo = reduzirAssistente(COM_ESCOLHAS, {
      tipo: "arquivo-escolhido",
      entrada: { nome: "outro.csv", bytes: new Uint8Array([2]), hash: null },
    })

    expect(proximo).toMatchObject({
      passo: "colunas",
      entrada: { nome: "outro.csv" },
      separador: undefined,
      mapeamento: null,
      decisoes: [],
      interagiu: true,
    })
  })

  it("trocar o separador zera o mapeamento e as decisões, mas mantém o arquivo e o passo", () => {
    const proximo = reduzirAssistente(COM_ESCOLHAS, {
      tipo: "separador-trocado",
      separador: ",",
    })

    expect(proximo).toMatchObject({
      passo: "bairros",
      entrada: ENTRADA,
      separador: ",",
      mapeamento: null,
      decisoes: [],
    })
  })

  it("alterar o mapeamento mantém as decisões", () => {
    const novo = { bairro: 1, periodo: 0, casos: 2 }

    const proximo = reduzirAssistente(COM_ESCOLHAS, {
      tipo: "mapeamento-alterado",
      mapeamento: novo,
    })

    expect(proximo.mapeamento).toEqual(novo)
    expect(proximo.decisoes).toHaveLength(1)
  })

  it("uma nova decisão do mesmo nome substitui a anterior e a de outro nome se soma", () => {
    const decidida = reduzirAssistente(COM_ESCOLHAS, {
      tipo: "decisao-registrada",
      decisao: { nomeNormalizado: "morada", tipo: "bairro", bairroId: "uv-20" },
    })
    const somada = reduzirAssistente(decidida, {
      tipo: "decisao-registrada",
      decisao: { nomeNormalizado: "aranau", tipo: "fora-da-cobertura" },
    })

    expect(decidida.decisoes).toEqual([
      { nomeNormalizado: "morada", tipo: "bairro", bairroId: "uv-20" },
    ])
    expect(somada.decisoes).toHaveLength(2)
  })

  it("mudar de passo registra que houve interação", () => {
    const proximo = reduzirAssistente(ESTADO_INICIAL, {
      tipo: "passo-alterado",
      passo: "colunas",
    })

    expect(proximo).toMatchObject({ passo: "colunas", interagiu: true })
  })

  it("cancelar descarta o arquivo, as escolhas e as decisões e volta ao envio", () => {
    expect(reduzirAssistente(COM_ESCOLHAS, { tipo: "cancelado" })).toEqual({
      ...ESTADO_INICIAL,
      interagiu: true,
    })
  })
})
