import { render, screen, within } from "@testing-library/react"

import PaginaFontes from "@/app/fontes/page"

describe("PaginaFontes", () => {
  it("lista exatamente bairros, escolas, limite municipal e mapa base, cada um com seus campos", () => {
    render(<PaginaFontes />)

    const cartoes = screen.getAllByRole("article")

    expect(
      cartoes.map(
        (cartao) =>
          within(cartao).getByRole("heading", { level: 2 }).textContent
      )
    ).toEqual([
      "Bairros (Unidades de Vizinhança)",
      "Escolas",
      "Limite municipal",
      "Mapa base",
    ])
    for (const cartao of cartoes) {
      for (const rotulo of [
        "Fonte:",
        "Etiqueta:",
        "Versão:",
        "Data de referência:",
        "Cobertura:",
      ]) {
        expect(cartao).toHaveTextContent(rotulo)
      }
      expect(
        within(cartao).getByRole("heading", { level: 3 })
      ).toHaveTextContent("Limitações conhecidas")
      expect(within(cartao).getAllByRole("listitem").length).toBeGreaterThan(0)
    }
  })

  it("mostra 'Não informada' na data das camadas de carga e as etiquetas de proveniência", () => {
    render(<PaginaFontes />)

    const bairros = screen.getByRole("article", {
      name: "Bairros (Unidades de Vizinhança)",
    })
    const mapaBase = screen.getByRole("article", { name: "Mapa base" })

    expect(bairros).toHaveTextContent("Data de referência:Não informada")
    expect(bairros).toHaveTextContent("Etiqueta:DERIVADO_VALIDAR")
    expect(bairros).toHaveTextContent(
      "não é arquivo oficial homologado da Prefeitura"
    )
    expect(mapaBase).toHaveTextContent("Etiqueta:COLABORATIVO")
    expect(mapaBase).toHaveTextContent("OpenStreetMap, licença ODbL")
  })

  it("não lista lagoas, distritos, ruas, rios nem setores", () => {
    render(<PaginaFontes />)

    expect(document.body).not.toHaveTextContent(
      /lagoa|distrito|ruas|rios|setores/i
    )
  })
})
