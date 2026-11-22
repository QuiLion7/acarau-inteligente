import { montarObra } from "./__fixtures__/obra"
import {
  escreverSituacoes,
  filtrarObras,
  lerSituacoes,
  resumirObras,
} from "./filtro-obras"

const OBRAS = [
  montarObra({
    id: "1",
    situacao: "planejada",
    estadoLocalizacao: "dentro-de-bairro",
    bairroId: "uv-10",
    atualizadoEm: "2026-11-01T10:00:00.000Z",
  }),
  montarObra({
    id: "2",
    situacao: "em_andamento",
    estadoLocalizacao: "dentro-de-bairro",
    bairroId: "uv-03",
    atualizadoEm: "2026-11-03T10:00:00.000Z",
  }),
  montarObra({
    id: "3",
    situacao: "em_andamento",
    estadoLocalizacao: "fora-da-cobertura",
    atualizadoEm: "2026-11-02T10:00:00.000Z",
  }),
  montarObra({
    id: "4",
    situacao: "suspensa",
    estadoLocalizacao: "dentro-de-bairro",
    bairroId: "uv-03",
    atualizadoEm: "2026-11-04T10:00:00.000Z",
  }),
  montarObra({
    id: "5",
    situacao: "planejada",
    estadoLocalizacao: "sem-localizacao",
    atualizadoEm: "2026-11-05T10:00:00.000Z",
  }),
]

const ids = (obras: readonly { id: string }[]) => obras.map(({ id }) => id)

describe("lerSituacoes", () => {
  it.each([
    [null, []],
    ["", []],
    ["planejada,suspensa", ["planejada", "suspensa"]],
    ["suspensa,planejada", ["planejada", "suspensa"]],
    ["em_andamento,em_andamento", ["em_andamento"]],
    ["invalida,concluida,PLANEJADA, suspensa", ["concluida"]],
  ])("lê %j como %j", (parametro, esperado) => {
    expect(lerSituacoes(parametro)).toEqual(esperado)
  })
})

describe("escreverSituacoes", () => {
  it("escreve as situações na ordem do catálogo e nada quando não há marcada", () => {
    expect(escreverSituacoes(["suspensa", "em_andamento"])).toBe(
      "em_andamento,suspensa"
    )
    expect(escreverSituacoes([])).toBeNull()
  })
})

describe("filtrarObras", () => {
  it("sem filtro devolve todas, da última atualização mais recente para a mais antiga", () => {
    expect(ids(filtrarObras(OBRAS, { situacoes: [], bairroId: null }))).toEqual(
      ["5", "4", "2", "3", "1"]
    )
  })

  it("combina mais de uma situação", () => {
    const filtradas = filtrarObras(OBRAS, {
      situacoes: ["em_andamento", "suspensa"],
      bairroId: null,
    })

    expect(ids(filtradas)).toEqual(["4", "2", "3"])
  })

  it("combina situações e bairro com e", () => {
    const filtradas = filtrarObras(OBRAS, {
      situacoes: ["em_andamento", "suspensa"],
      bairroId: "uv-03",
    })

    expect(ids(filtradas)).toEqual(["4", "2"])
  })

  it("devolve vazio quando nenhuma obra combina", () => {
    expect(
      filtrarObras(OBRAS, { situacoes: ["concluida"], bairroId: null })
    ).toEqual([])
  })

  it("não altera o array recebido", () => {
    const antes = ids(OBRAS)

    filtrarObras(OBRAS, { situacoes: [], bairroId: null })

    expect(ids(OBRAS)).toEqual(antes)
  })
})

describe("resumirObras", () => {
  it("conta o total, cada situação e as obras sem localização", () => {
    expect(resumirObras(OBRAS)).toEqual({
      total: 5,
      porSituacao: {
        planejada: 2,
        em_andamento: 2,
        concluida: 0,
        suspensa: 1,
      },
      semLocalizacao: 1,
    })
  })

  it("mostra 0 em cada situação quando não há obra", () => {
    expect(resumirObras([])).toEqual({
      total: 0,
      porSituacao: { planejada: 0, em_andamento: 0, concluida: 0, suspensa: 0 },
      semLocalizacao: 0,
    })
  })
})
