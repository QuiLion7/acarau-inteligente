import { render, screen } from "@testing-library/react"

import PaginaAdmin from "@/app/admin/page"
import type { SessaoValida } from "@/lib/auth/papeis"
import { exigirPapelNaPagina } from "@/lib/server/auth/dal"

jest.mock("@/lib/server/auth/dal", () => ({ exigirPapelNaPagina: jest.fn() }))
// O botão é do cliente e tem teste próprio: aqui só importa o que a página decide e mostra.
jest.mock("@/app/admin/components/reiniciar-demo", () => ({
  ReiniciarDemo: () => <button>Reiniciar a demonstração (double)</button>,
}))

const SESSAO: SessaoValida = {
  usuario: "admin",
  nome: "Administrador Demo",
  papel: "administrador",
}

describe("página de administração", () => {
  it("exige o papel de administrador para o caminho /admin", async () => {
    jest
      .mocked(exigirPapelNaPagina)
      .mockResolvedValue({ tipo: "ok", sessao: SESSAO })

    await PaginaAdmin()

    expect(exigirPapelNaPagina).toHaveBeenCalledWith("administrador", "/admin")
  })

  it("identifica a sessão e oferece reiniciar a demonstração (PA-02.03)", async () => {
    jest
      .mocked(exigirPapelNaPagina)
      .mockResolvedValue({ tipo: "ok", sessao: SESSAO })

    render(await PaginaAdmin())

    expect(
      screen.getByRole("heading", { level: 1, name: "Administração" })
    ).toBeVisible()
    expect(
      screen.getByText("Você entrou como Administrador Demo (Administrador).")
    ).toBeVisible()
    expect(
      screen.getByRole("button", { name: "Reiniciar a demonstração (double)" })
    ).toBeVisible()
  })

  it("leva à Auditoria com um link ao lado do reinício (PA-05.02)", async () => {
    jest
      .mocked(exigirPapelNaPagina)
      .mockResolvedValue({ tipo: "ok", sessao: SESSAO })

    render(await PaginaAdmin())

    expect(screen.getByRole("link", { name: "Auditoria" })).toHaveAttribute(
      "href",
      "/admin/auditoria"
    )
  })

  it("mostra o estado sem permissão para quem não é administrador", async () => {
    jest
      .mocked(exigirPapelNaPagina)
      .mockResolvedValue({ tipo: "sem-permissao" })

    render(await PaginaAdmin())

    expect(
      screen.getByRole("heading", { level: 1, name: "Sem permissão" })
    ).toBeVisible()
    expect(screen.queryByRole("button")).toBeNull()
  })
})
