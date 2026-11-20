import {
  artefatoCamadasSchema,
  artefatoTerritorioSchema,
} from "./artefato-schema"

describe("artefato-schema", () => {
  it("recusa id de camada fora do catálogo (lagoas nunca é anunciada)", () => {
    const resultado = artefatoCamadasSchema.safeParse({
      camadas: [
        { id: "lagoas", versao: "x", dataReferencia: null, registros: 1 },
      ],
    })

    expect(resultado.success).toBe(false)
  })

  it("recusa campo desconhecido no artefato do território", () => {
    const resultado = artefatoTerritorioSchema.safeParse({
      versaoArtefato: 1,
      campoExtra: true,
    })

    expect(resultado.success).toBe(false)
  })
})
