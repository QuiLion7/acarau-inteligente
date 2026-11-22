import { render, screen } from "@testing-library/react"

import { LinkExportarRelatorio } from "@/components/relatorios/link-exportar-relatorio"

let consulta = ""

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(consulta),
}))

function renderizar(parametros: string) {
  consulta = parametros
  render(<LinkExportarRelatorio />)
  return screen.getByRole("link", { name: "Exportar relatório" })
}

describe("LinkExportarRelatorio (TU-16, CA-05.02)", () => {
  it("leva bairro, período e versão da URL atual para /relatorios", () => {
    const link = renderizar(
      "bairro=uv-10&periodo=2026&versao=6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f"
    )

    const url = new URL(link.getAttribute("href") ?? "", "http://localhost")
    expect(url.pathname).toBe("/relatorios")
    expect(Object.fromEntries(url.searchParams)).toEqual({
      bairro: "uv-10",
      periodo: "2026",
      versao: "6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
    })
  })

  it("não leva parâmetros que não são do relatório (situação, nova, pagina)", () => {
    const link = renderizar("bairro=uv-10&situacao=planejada&nova=1&pagina=2")

    expect(link).toHaveAttribute("href", "/relatorios?bairro=uv-10")
  })

  it("sem filtros o link vai para /relatorios limpo", () => {
    expect(renderizar("")).toHaveAttribute("href", "/relatorios")
  })

  it("codifica o valor da URL e não o interpreta", () => {
    const link = renderizar("bairro=" + encodeURIComponent("<b>x</b> & y"))

    const url = new URL(link.getAttribute("href") ?? "", "http://localhost")
    expect(url.searchParams.get("bairro")).toBe("<b>x</b> & y")
    expect(link.getAttribute("href")).not.toContain("<")
  })
})
