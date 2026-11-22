import { legendaDosBairros } from "@/lib/exportacao/legendas-png"
import {
  montarMolduraPng,
  SELO_DEMONSTRACAO,
  SELO_SINTETICO,
} from "@/lib/exportacao/moldura-png"

const LEGENDA = legendaDosBairros(false)

describe("montarMolduraPng (RF-05.22, RN-05.02)", () => {
  it("em Saúde e Obras leva os selos de demonstração e de dados sintéticos", () => {
    const moldura = montarMolduraPng({
      titulo: "Saúde - casos por bairro",
      bairro: "Centro",
      outrosFiltros: ["Período: 2026"],
      legenda: LEGENDA,
      sintetico: true,
    })

    expect(moldura).toEqual({
      titulo: "Saúde - casos por bairro",
      filtros: ["Bairro: Centro", "Período: 2026"],
      legenda: LEGENDA,
      selos: [SELO_DEMONSTRACAO, SELO_SINTETICO],
    })
  })

  it("em Território e Educação só leva o selo de demonstração", () => {
    const moldura = montarMolduraPng({
      titulo: "Educação - escolas",
      bairro: null,
      legenda: LEGENDA,
      sintetico: false,
    })

    expect(moldura.selos).toEqual([SELO_DEMONSTRACAO])
  })

  it("sem bairro o filtro diz 'todos os bairros', nunca vazio", () => {
    const moldura = montarMolduraPng({
      titulo: "Obras",
      bairro: null,
      legenda: [],
      sintetico: true,
    })

    expect(moldura.filtros).toEqual(["Bairro: todos os bairros"])
  })
})
