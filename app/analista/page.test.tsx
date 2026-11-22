import { render, screen } from "@testing-library/react"

import PaginaAnalista from "@/app/analista/page"
import type { SessaoValida } from "@/lib/auth/papeis"
import { exigirPapelNaPagina } from "@/lib/server/auth/dal"

jest.mock("@/lib/server/auth/dal", () => ({ exigirPapelNaPagina: jest.fn() }))

const SESSAO: SessaoValida = {
  usuario: "analista",
  nome: "Analista Demo",
  papel: "analista",
}

describe("página da área do analista", () => {
  it("exige o papel de analista para o caminho /analista", async () => {
    jest
      .mocked(exigirPapelNaPagina)
      .mockResolvedValue({ tipo: "ok", sessao: SESSAO })

    await PaginaAnalista()

    expect(exigirPapelNaPagina).toHaveBeenCalledWith("analista", "/analista")
  })

  it("identifica a sessão e aponta para Importar CSV e Datasets na Saúde (PA-02.02)", async () => {
    jest
      .mocked(exigirPapelNaPagina)
      .mockResolvedValue({ tipo: "ok", sessao: SESSAO })

    render(await PaginaAnalista())

    expect(
      screen.getByRole("heading", { level: 1, name: "Área do analista" })
    ).toBeVisible()
    expect(
      screen.getByText("Você entrou como Analista Demo (Analista).")
    ).toBeVisible()
    expect(screen.getByRole("link", { name: "Importar CSV" })).toHaveAttribute(
      "href",
      "/saude/importar"
    )
    expect(screen.getByRole("link", { name: "Datasets" })).toHaveAttribute(
      "href",
      "/saude/datasets"
    )
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("tem a seção Obras com o atalho que leva ao cadastro com o formulário aberto (RF-04.33, CA-04.22)", async () => {
    jest
      .mocked(exigirPapelNaPagina)
      .mockResolvedValue({ tipo: "ok", sessao: SESSAO })

    render(await PaginaAnalista())

    expect(
      screen.getByRole("heading", { level: 2, name: "Obras" })
    ).toBeVisible()
    expect(
      screen.getByRole("link", { name: "Cadastrar obra" })
    ).toHaveAttribute("href", "/obras?nova=1")
  })

  it("mostra o estado sem permissão quando o papel não basta", async () => {
    jest
      .mocked(exigirPapelNaPagina)
      .mockResolvedValue({ tipo: "sem-permissao" })

    render(await PaginaAnalista())

    expect(
      screen.getByRole("heading", { level: 1, name: "Sem permissão" })
    ).toBeVisible()
    expect(screen.queryByText(/Você entrou como/)).toBeNull()
  })
})
