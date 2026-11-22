import { ApiError } from "@/lib/api/api-error"
import { montarObra } from "./__fixtures__/obra"
import {
  errosDoServidorPorCampo,
  valoresIniciaisDoFormulario,
} from "./formulario-obra"
import { obraFormularioSchema } from "@/lib/validations/obra-schema"

describe("valoresIniciaisDoFormulario", () => {
  it("nova obra: tudo vazio e situação planejada", () => {
    expect(valoresIniciaisDoFormulario(null)).toEqual({
      titulo: "",
      situacao: "planejada",
      descricao: "",
      categoria: "",
      secretaria: "",
      dataInicio: "",
      dataPrevista: "",
      valorPrevisto: "",
      latitude: "",
      longitude: "",
    })
  })

  it("edição: os campos da obra como o usuário os digita (pt-BR) e o que não há vira vazio", () => {
    const valores = valoresIniciaisDoFormulario(
      montarObra({
        titulo: "DEMO - Praça",
        situacao: "em_andamento",
        categoria: "praca_lazer",
        secretaria: "Infraestrutura",
        dataInicio: "2026-12-01",
        dataPrevista: "2027-03-31",
        valorPrevistoCentavos: 25_000_000,
        localizacao: { longitude: -40.118958, latitude: -2.885116 },
      })
    )

    expect(valores).toMatchObject({
      titulo: "DEMO - Praça",
      situacao: "em_andamento",
      descricao: "",
      categoria: "praca_lazer",
      secretaria: "Infraestrutura",
      dataInicio: "2026-12-01",
      dataPrevista: "2027-03-31",
      valorPrevisto: "250.000,00",
      latitude: "-2,885116",
      longitude: "-40,118958",
    })
  })

  it("devolve ao schema do formulário a mesma obra, sem perda", () => {
    const obra = montarObra({
      valorPrevistoCentavos: 123_456,
      localizacao: { longitude: -40.1, latitude: -2.9 },
      descricao: "Texto",
    })

    const entrada = obraFormularioSchema.parse(
      valoresIniciaisDoFormulario(obra)
    )

    expect(entrada).toMatchObject({
      titulo: obra.titulo,
      descricao: "Texto",
      valorPrevistoCentavos: 123_456,
      localizacao: { longitude: -40.1, latitude: -2.9 },
    })
  })

  it("valor zero volta como 0,00, não como campo vazio", () => {
    expect(
      valoresIniciaisDoFormulario(montarObra({ valorPrevistoCentavos: 0 }))
        .valorPrevisto
    ).toBe("0,00")
  })
})

describe("errosDoServidorPorCampo", () => {
  const validacao = (campos: unknown) =>
    new ApiError("VALIDACAO", "Os dados enviados são inválidos.", {
      status: 400,
      details: { campos: campos as Record<string, unknown> },
    })

  it("traduz o campo do request para o campo do formulário", () => {
    const erros = errosDoServidorPorCampo(
      validacao({
        titulo: "O título deve ter pelo menos 3 caracteres.",
        valorPrevistoCentavos: "O valor previsto não pode ser negativo.",
        localizacao: "O ponto está fora do município de Acaraú",
        dataPrevista: "A data prevista não pode ser anterior à data de início.",
      })
    )

    expect(erros).toEqual({
      titulo: "O título deve ter pelo menos 3 caracteres.",
      valorPrevisto: "O valor previsto não pode ser negativo.",
      localizacao: "O ponto está fora do município de Acaraú",
      dataPrevista: "A data prevista não pode ser anterior à data de início.",
    })
  })

  it("ignora campo que o formulário não tem e mensagem que não é texto", () => {
    expect(
      errosDoServidorPorCampo(validacao({ id: "x", titulo: 5, corpo: "y" }))
    ).toEqual({})
  })

  it.each([
    [
      "erro de outro código",
      new ApiError("ERRO_INTERNO", "Falha.", { status: 500 }),
    ],
    [
      "VALIDACAO sem campos",
      new ApiError("VALIDACAO", "Inválido.", { status: 400 }),
    ],
    ["erro que não é da API", new Error("quebrou")],
    ["valor que não é erro", undefined],
  ])("%s não gera mensagem por campo", (_descricao, erro) => {
    expect(errosDoServidorPorCampo(erro)).toEqual({})
  })
})
