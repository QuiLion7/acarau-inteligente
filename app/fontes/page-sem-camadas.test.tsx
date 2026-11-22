import { render, screen } from "@testing-library/react"

import PaginaFontes from "@/app/fontes/page"

jest.mock("@/lib/config/camadas-carregadas", () => ({ CAMADAS_CARREGADAS: [] }))
jest.mock("@/lib/server/db/cliente", () => ({
  obterBanco: jest.fn(() => ({})),
}))
jest.mock("@/lib/server/datasets/dataset-repositorio", () => ({
  listarDatasetsPublicados: jest.fn().mockResolvedValue([]),
}))
jest.mock("@/lib/server/obras/obra-repositorio", () => ({
  resumirObrasParaFontes: jest
    .fn()
    .mockResolvedValue({ quantidade: 0, ultimaAtualizacao: null }),
}))

describe("PaginaFontes sem camada carregada (PA-01.04)", () => {
  it("diz que nenhuma camada foi carregada e não lista cartão", async () => {
    render(await PaginaFontes())

    expect(
      screen.getByRole("heading", {
        name: "Nenhuma camada de dados foi carregada ainda",
      })
    ).toBeInTheDocument()
    expect(screen.queryAllByRole("article")).toHaveLength(0)
  })
})
