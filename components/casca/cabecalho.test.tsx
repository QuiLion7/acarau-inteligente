import { screen, within } from "@testing-library/react"

import { Cabecalho } from "@/components/casca/cabecalho"
import type { SessaoValida } from "@/lib/auth/papeis"
import { obterSessaoAtual } from "@/lib/server/auth/dal"
import { renderComProviders } from "@/test/render-com-providers"

jest.mock("@/lib/server/auth/dal", () => ({ obterSessaoAtual: jest.fn() }))
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn(), refresh: jest.fn() }),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const ANALISTA: SessaoValida = {
  usuario: "analista",
  nome: "Analista Demo",
  papel: "analista",
}
const ADMINISTRADOR: SessaoValida = {
  usuario: "admin",
  nome: "Administrador Demo",
  papel: "administrador",
}

async function renderizarCom(sessao: SessaoValida | null) {
  jest.mocked(obterSessaoAtual).mockResolvedValue(sessao)
  renderComProviders(await Cabecalho())
  return within(screen.getByRole("banner"))
}

describe("Cabecalho", () => {
  it("mostra nome, selo e entrar, e só os cinco módulos, ao visitante", async () => {
    const cabecalho = await renderizarCom(null)

    expect(
      cabecalho.getByRole("link", { name: "Demonstração Independente" })
    ).toHaveAttribute("href", "/sobre")
    expect(cabecalho.getByRole("link", { name: "Entrar" })).toBeVisible()
    const menu = cabecalho.getByRole("navigation", { name: "Módulos" })
    expect(within(menu).getAllByRole("link")).toHaveLength(5)
  })

  it("mostra o nome e o papel do analista e a área do analista, sem a administração", async () => {
    const cabecalho = await renderizarCom(ANALISTA)

    expect(cabecalho.getByText("Analista Demo · Analista")).toBeVisible()
    expect(
      cabecalho.getByRole("link", { name: "Área do analista" })
    ).toBeVisible()
    expect(cabecalho.queryByRole("link", { name: "Administração" })).toBeNull()
    expect(cabecalho.queryByRole("link", { name: "Entrar" })).toBeNull()
  })

  it("mostra as duas áreas restritas ao administrador", async () => {
    const cabecalho = await renderizarCom(ADMINISTRADOR)

    expect(
      cabecalho.getByText("Administrador Demo · Administrador")
    ).toBeVisible()
    expect(
      cabecalho.getByRole("link", { name: "Área do analista" })
    ).toBeVisible()
    expect(cabecalho.getByRole("link", { name: "Administração" })).toBeVisible()
  })
})
