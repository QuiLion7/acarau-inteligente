import {
  obraEntradaSchema,
  obraFormularioSchema,
  obraSchema,
} from "@/lib/validations/obra-schema"
import { montarObra } from "@/lib/obras/__fixtures__/obra"
import { VALOR_MAXIMO_CENTAVOS } from "@/lib/obras/valores-obra"

const MINIMO = { titulo: "Praça nova", situacao: "planejada" }

function mensagensPorCampo(
  schema: typeof obraEntradaSchema | typeof obraFormularioSchema,
  dados: unknown
): Record<string, string> {
  const resultado = schema.safeParse(dados)
  if (resultado.success) return {}
  return Object.fromEntries(
    resultado.error.issues.map((problema) => [
      problema.path.join("."),
      problema.message,
    ])
  )
}

describe("obraEntradaSchema", () => {
  it("aceita só título e situação e deixa os opcionais como null", () => {
    expect(obraEntradaSchema.parse(MINIMO)).toEqual({
      titulo: "Praça nova",
      situacao: "planejada",
      descricao: null,
      categoria: null,
      secretaria: null,
      dataInicio: null,
      dataPrevista: null,
      valorPrevistoCentavos: null,
      localizacao: null,
    })
  })

  it("aceita todos os campos, tira espaços das pontas e grava a coordenada com 6 casas", () => {
    const resultado = obraEntradaSchema.parse({
      titulo: "  DEMO - Praça  ",
      situacao: "em_andamento",
      descricao: "  Reforma  ",
      categoria: "praca_lazer",
      secretaria: " Infraestrutura ",
      dataInicio: "2026-12-01",
      dataPrevista: "2027-03-31",
      valorPrevistoCentavos: 25_000_000,
      localizacao: { longitude: -40.1189581, latitude: -2.8851159 },
    })

    expect(resultado).toMatchObject({
      titulo: "DEMO - Praça",
      descricao: "Reforma",
      secretaria: "Infraestrutura",
      localizacao: { longitude: -40.118958, latitude: -2.885116 },
    })
  })

  it("trata texto vazio como ausente", () => {
    const resultado = obraEntradaSchema.parse({
      ...MINIMO,
      descricao: "   ",
      secretaria: "",
    })

    expect(resultado).toMatchObject({ descricao: null, secretaria: null })
  })

  it("recusa título curto ou longo, aceitando os limites de 3 e 120 caracteres", () => {
    expect(
      mensagensPorCampo(obraEntradaSchema, { ...MINIMO, titulo: "ab" })
    ).toEqual({ titulo: "O título deve ter pelo menos 3 caracteres." })
    expect(
      mensagensPorCampo(obraEntradaSchema, {
        ...MINIMO,
        titulo: "a".repeat(121),
      })
    ).toEqual({ titulo: "O título deve ter no máximo 120 caracteres." })
    expect(
      mensagensPorCampo(obraEntradaSchema, { ...MINIMO, titulo: "abc" })
    ).toEqual({})
    expect(
      mensagensPorCampo(obraEntradaSchema, {
        ...MINIMO,
        titulo: "a".repeat(120),
      })
    ).toEqual({})
  })

  it("pede título e situação quando faltam, sem eco do valor", () => {
    expect(mensagensPorCampo(obraEntradaSchema, {})).toEqual({
      titulo: "Informe o título da obra.",
      situacao: "Escolha uma das situações permitidas.",
    })
  })

  it("recusa situação e categoria fora da lista sem repetir o que veio", () => {
    const mensagens = mensagensPorCampo(obraEntradaSchema, {
      ...MINIMO,
      situacao: "ATRASADA-SECRETA",
      categoria: "CATEGORIA-SECRETA",
    })

    expect(mensagens).toEqual({
      situacao: "Escolha uma das situações permitidas.",
      categoria: "Escolha uma das categorias da lista.",
    })
    expect(JSON.stringify(mensagens)).not.toContain("SECRETA")
  })

  it("recusa descrição e secretaria acima do limite", () => {
    expect(
      mensagensPorCampo(obraEntradaSchema, {
        ...MINIMO,
        descricao: "a".repeat(2001),
        secretaria: "a".repeat(121),
      })
    ).toEqual({
      descricao: "A descrição deve ter no máximo 2000 caracteres.",
      secretaria: "A secretaria deve ter no máximo 120 caracteres.",
    })
  })

  it("recusa data prevista anterior ao início no campo da data prevista e aceita a mesma data", () => {
    expect(
      mensagensPorCampo(obraEntradaSchema, {
        ...MINIMO,
        dataInicio: "2026-12-02",
        dataPrevista: "2026-12-01",
      })
    ).toEqual({
      dataPrevista: "A data prevista não pode ser anterior à data de início.",
    })
    expect(
      mensagensPorCampo(obraEntradaSchema, {
        ...MINIMO,
        dataInicio: "2026-12-01",
        dataPrevista: "2026-12-01",
      })
    ).toEqual({})
  })

  it("aceita uma data sozinha e recusa data que não existe", () => {
    expect(
      mensagensPorCampo(obraEntradaSchema, {
        ...MINIMO,
        dataPrevista: "2026-01-01",
      })
    ).toEqual({})
    expect(
      mensagensPorCampo(obraEntradaSchema, {
        ...MINIMO,
        dataInicio: "2026-02-30",
      })
    ).toEqual({ dataInicio: "Informe uma data válida." })
  })

  it("aceita valor de 0 até o teto e recusa negativo, acima do teto e fracionado", () => {
    for (const valor of [0, VALOR_MAXIMO_CENTAVOS]) {
      expect(
        mensagensPorCampo(obraEntradaSchema, {
          ...MINIMO,
          valorPrevistoCentavos: valor,
        })
      ).toEqual({})
    }
    expect(
      mensagensPorCampo(obraEntradaSchema, {
        ...MINIMO,
        valorPrevistoCentavos: -1,
      })
    ).toEqual({
      valorPrevistoCentavos: "O valor previsto não pode ser negativo.",
    })
    expect(
      mensagensPorCampo(obraEntradaSchema, {
        ...MINIMO,
        valorPrevistoCentavos: VALOR_MAXIMO_CENTAVOS + 1,
      })
    ).toEqual({
      valorPrevistoCentavos:
        "O valor previsto passa do limite de R$ 10 bilhões.",
    })
    expect(
      mensagensPorCampo(obraEntradaSchema, {
        ...MINIMO,
        valorPrevistoCentavos: 10.5,
      })
    ).toEqual({
      valorPrevistoCentavos: "Informe o valor em reais, como 250.000,00.",
    })
  })

  it("recusa localização com uma coordenada só e coordenada fora de ±90 e ±180", () => {
    expect(
      Object.keys(
        mensagensPorCampo(obraEntradaSchema, {
          ...MINIMO,
          localizacao: { latitude: -2 },
        })
      )
    ).toEqual(["localizacao.longitude"])
    expect(
      mensagensPorCampo(obraEntradaSchema, {
        ...MINIMO,
        localizacao: { latitude: 91, longitude: 181 },
      })
    ).toEqual({
      "localizacao.longitude": "A longitude deve ficar entre -180 e 180.",
      "localizacao.latitude": "A latitude deve ficar entre -90 e 90.",
    })
    expect(
      mensagensPorCampo(obraEntradaSchema, {
        ...MINIMO,
        localizacao: { latitude: -90, longitude: 180 },
      })
    ).toEqual({})
  })

  it("descarta bairroId, proveniencia e estado de localização enviados pelo cliente", () => {
    const resultado = obraEntradaSchema.parse({
      ...MINIMO,
      bairroId: "uv-99",
      proveniencia: "OFICIAL",
      estadoLocalizacao: "dentro-de-bairro",
    })

    expect(resultado).not.toHaveProperty("bairroId")
    expect(resultado).not.toHaveProperty("proveniencia")
    expect(resultado).not.toHaveProperty("estadoLocalizacao")
  })
})

const FORMULARIO_VAZIO = {
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
}
const FORMULARIO_MINIMO = { ...FORMULARIO_VAZIO, titulo: "Praça nova" }

describe("obraFormularioSchema", () => {
  it("converte o texto do formulário na mesma entrada que a rota recebe", () => {
    const resultado = obraFormularioSchema.parse({
      titulo: " DEMO - Praça ",
      situacao: "planejada",
      descricao: "",
      categoria: "praca_lazer",
      secretaria: "Infraestrutura",
      dataInicio: "2026-12-01",
      dataPrevista: "2027-03-31",
      valorPrevisto: "250.000,00",
      latitude: "-2,885116",
      longitude: "-40.118958",
    })

    expect(resultado).toEqual({
      titulo: "DEMO - Praça",
      situacao: "planejada",
      descricao: null,
      categoria: "praca_lazer",
      secretaria: "Infraestrutura",
      dataInicio: "2026-12-01",
      dataPrevista: "2027-03-31",
      valorPrevistoCentavos: 25_000_000,
      localizacao: { longitude: -40.118958, latitude: -2.885116 },
    })
    expect(obraEntradaSchema.parse(resultado)).toEqual(resultado)
  })

  it("aceita o mínimo, com os campos vazios virando null", () => {
    expect(obraFormularioSchema.parse(FORMULARIO_MINIMO)).toEqual(
      obraEntradaSchema.parse({ titulo: "Praça nova", situacao: "planejada" })
    )
  })

  it("mostra cada erro no campo certo, todos de uma vez", () => {
    const mensagens = mensagensPorCampo(obraFormularioSchema, {
      ...FORMULARIO_VAZIO,
      dataInicio: "2026-12-02",
      dataPrevista: "2026-12-01",
      valorPrevisto: "abc",
      latitude: "-2,8",
    })

    expect(mensagens).toEqual({
      titulo: "O título deve ter pelo menos 3 caracteres.",
      dataPrevista: "A data prevista não pode ser anterior à data de início.",
      valorPrevisto: "Informe o valor em reais, como 250.000,00.",
      longitude: "Informe também a longitude.",
    })
  })

  it("mostra os erros de conversão mesmo com o título válido", () => {
    expect(
      mensagensPorCampo(obraFormularioSchema, {
        ...FORMULARIO_MINIMO,
        valorPrevisto: "-1",
        longitude: "-40",
      })
    ).toEqual({
      valorPrevisto: "O valor previsto não pode ser negativo.",
      latitude: "Informe também a latitude.",
    })
  })

  it("recusa coordenada que não é número ou que passa dos limites geográficos", () => {
    expect(
      mensagensPorCampo(obraFormularioSchema, {
        ...FORMULARIO_MINIMO,
        latitude: "abc",
        longitude: "-40",
      })
    ).toEqual({
      latitude: "Informe um número em graus decimais, como -2,885116.",
    })
    expect(
      mensagensPorCampo(obraFormularioSchema, {
        ...FORMULARIO_MINIMO,
        latitude: "95",
        longitude: "-200",
      })
    ).toEqual({
      latitude: "A latitude deve ficar entre -90 e 90.",
      longitude: "A longitude deve ficar entre -180 e 180.",
    })
  })

  it("recusa valor acima do teto no campo do valor", () => {
    expect(
      mensagensPorCampo(obraFormularioSchema, {
        ...FORMULARIO_MINIMO,
        valorPrevisto: "10.000.000.000,01",
      })
    ).toEqual({
      valorPrevisto: "O valor previsto passa do limite de R$ 10 bilhões.",
    })
  })

  it("aceita valor 0 e o teto", () => {
    expect(
      obraFormularioSchema.parse({ ...FORMULARIO_MINIMO, valorPrevisto: "0" })
        .valorPrevistoCentavos
    ).toBe(0)
    expect(
      obraFormularioSchema.parse({
        ...FORMULARIO_MINIMO,
        valorPrevisto: "10.000.000.000,00",
      }).valorPrevistoCentavos
    ).toBe(VALOR_MAXIMO_CENTAVOS)
  })
})

describe("obraSchema", () => {
  it("aceita a obra como o servidor a devolve", () => {
    const obra = montarObra({
      estadoLocalizacao: "dentro-de-bairro",
      bairroId: "uv-10",
      localizacao: { longitude: -40.118958, latitude: -2.885116 },
    })

    expect(obraSchema.parse(obra)).toEqual(obra)
  })

  it("recusa obra que não é sintética ou sem histórico", () => {
    expect(
      obraSchema.safeParse({ ...montarObra(), proveniencia: "OFICIAL" }).success
    ).toBe(false)
    expect(
      obraSchema.safeParse({ ...montarObra(), historico: [] }).success
    ).toBe(false)
  })
})
