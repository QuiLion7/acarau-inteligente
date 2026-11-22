import { montarObra } from "./__fixtures__/obra"
import { rotuloDoBairroDaObra } from "./apresentacao-obra"

const BAIRROS = [
  { id: "uv-10", nome: "Centro" },
  { id: "uv-03", nome: "São Benedito" },
]

describe("rotuloDoBairroDaObra", () => {
  it.each([
    [
      "dentro de bairro",
      { estadoLocalizacao: "dentro-de-bairro", bairroId: "uv-10" },
      "Centro",
    ],
    [
      "fora da cobertura",
      { estadoLocalizacao: "fora-da-cobertura", bairroId: null },
      "Fora da cobertura dos bairros",
    ],
    [
      "sem localização",
      { estadoLocalizacao: "sem-localizacao", bairroId: null },
      "Sem localização",
    ],
  ] as const)("para a obra %s escreve %j", (_descricao, campos, esperado) => {
    expect(rotuloDoBairroDaObra(montarObra(campos), BAIRROS)).toBe(esperado)
  })

  it("não mostra o id técnico quando o bairro gravado não está na lista", () => {
    const obra = montarObra({
      estadoLocalizacao: "dentro-de-bairro",
      bairroId: "uv-99",
    })

    expect(rotuloDoBairroDaObra(obra, BAIRROS)).toBe(
      "Fora da cobertura dos bairros"
    )
  })
})
