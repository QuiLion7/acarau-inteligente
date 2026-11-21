import { BAIRROS } from "@/lib/importacao/__fixtures__/analise"
import {
  corresponderNome,
  decisaoValida,
  resolverDestino,
} from "@/lib/importacao/correspondencia-bairros"

function idsDosCandidatos(nome: string): string[] {
  const resultado = corresponderNome(nome, BAIRROS)
  if (resultado.estado !== "ambiguo") {
    throw new Error(`esperava ambíguo, veio ${resultado.estado}`)
  }
  return resultado.candidatos.map(({ id }) => id)
}

describe("corresponderNome (TU-08)", () => {
  it.each([
    ["SAO BENEDITO", "uv-03"],
    ["  centro ", "uv-10"],
    ["São Benedito", "uv-03"],
    ["ANTÔNIO LIVINO DA SILVEIRA", "uv-07"],
    ["3", "uv-03"],
    ["uv 10", "uv-10"],
    ["UV-07", "uv-07"],
  ])("reconhece %j como %s", (nome, bairroId) => {
    expect(corresponderNome(nome, BAIRROS)).toEqual({
      estado: "reconhecido",
      bairroId,
      origem: "automatica",
    })
  })

  it("Morada é ambíguo e mostra os candidatos Morada dos Ventos e Morada Nova", () => {
    expect(idsDosCandidatos("Morada")).toEqual(["uv-20", "uv-21"])
  })

  it("trecho de um nome só continua ambíguo: nunca associa sem confirmação", () => {
    expect(idsDosCandidatos("Benedito")).toEqual(["uv-03"])
  })

  it.each(["Aranaú", "99", "uv 99", "", "   "])("não reconhece %j", (nome) => {
    expect(corresponderNome(nome, BAIRROS)).toEqual({
      estado: "nao-reconhecido",
    })
  })

  it("erro de digitação sem trecho em comum não é adivinhado (sem distância de edição)", () => {
    expect(corresponderNome("Sao Benidito", BAIRROS).estado).toBe(
      "nao-reconhecido"
    )
  })

  it("dois bairros com o mesmo nome normalizado ficam ambíguos em vez de escolher um", () => {
    const duplicados = [
      { id: "uv-01", uv: 1, nome: "Centro", nomeLei: "CENTRO" },
      { id: "uv-02", uv: 2, nome: "Centro", nomeLei: "CENTRO" },
    ]

    expect(corresponderNome("centro", duplicados)).toMatchObject({
      estado: "ambiguo",
      candidatos: duplicados,
    })
  })
})

describe("decisaoValida e resolverDestino", () => {
  it("vale a última decisão do nome", () => {
    const decisoes = [
      { nomeNormalizado: "morada", tipo: "bairro", bairroId: "uv-20" },
      { nomeNormalizado: "morada", tipo: "fora-da-cobertura" },
    ] as const

    expect(decisaoValida("morada", decisoes, BAIRROS)).toEqual(decisoes[1])
  })

  it("ignora decisão com bairro fora dos 24, e o nome continua pendente", () => {
    const decisao = decisaoValida(
      "morada",
      [{ nomeNormalizado: "morada", tipo: "bairro", bairroId: "uv-99" }],
      BAIRROS
    )

    expect(decisao).toBeNull()
  })

  it("sem decisão para o nome devolve nulo", () => {
    expect(
      decisaoValida(
        "morada",
        [{ nomeNormalizado: "outro", tipo: "fora-da-cobertura" }],
        BAIRROS
      )
    ).toBeNull()
  })

  it("destino do ambíguo e do não reconhecido só existe com decisão", () => {
    const ambiguo = corresponderNome("Morada", BAIRROS)

    expect(resolverDestino(ambiguo, null)).toBeNull()
    expect(
      resolverDestino(ambiguo, {
        nomeNormalizado: "morada",
        tipo: "bairro",
        bairroId: "uv-21",
      })
    ).toEqual({ tipo: "bairro", bairroId: "uv-21", origem: "manual" })
    expect(
      resolverDestino(ambiguo, {
        nomeNormalizado: "morada",
        tipo: "fora-da-cobertura",
      })
    ).toEqual({ tipo: "fora-da-cobertura", origem: "manual" })
  })

  it("reconhecido segue sozinho, mesmo com uma decisão contrária", () => {
    expect(
      resolverDestino(corresponderNome("Centro", BAIRROS), {
        nomeNormalizado: "centro",
        tipo: "fora-da-cobertura",
      })
    ).toEqual({ tipo: "bairro", bairroId: "uv-10", origem: "automatica" })
  })
})
