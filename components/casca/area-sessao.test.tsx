import { screen } from "@testing-library/react"

import { AreaSessao } from "@/components/casca/area-sessao"
import { renderComProviders } from "@/test/render-com-providers"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), refresh: jest.fn() }),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

describe("AreaSessao", () => {
  it("oferece entrar, sem botão de sair, quando não há sessão", () => {
    renderComProviders(<AreaSessao sessao={null} />)

    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute(
      "href",
      "/entrar"
    )
    expect(screen.queryByRole("button", { name: "Sair" })).toBeNull()
  })

  it("mostra o nome e o papel do analista com o botão de sair", () => {
    renderComProviders(
      <AreaSessao
        sessao={{
          usuario: "analista",
          nome: "Analista Demo",
          papel: "analista",
        }}
      />
    )

    expect(screen.getByText("Analista Demo · Analista")).toBeVisible()
    expect(screen.getByRole("button", { name: "Sair" })).toBeVisible()
    expect(screen.queryByRole("link", { name: "Entrar" })).toBeNull()
  })

  it("mostra o papel de administrador", () => {
    renderComProviders(
      <AreaSessao
        sessao={{
          usuario: "admin",
          nome: "Administrador Demo",
          papel: "administrador",
        }}
      />
    )

    expect(screen.getByText("Administrador Demo · Administrador")).toBeVisible()
  })
})
