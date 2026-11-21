import { render, screen } from "@testing-library/react"

import PaginaDatasets from "@/app/saude/datasets/page"
import type { SessaoValida } from "@/lib/auth/papeis"
import { exigirPapelNaPagina } from "@/lib/server/auth/dal"

jest.mock("@/lib/server/auth/dal", () => ({ exigirPapelNaPagina: jest.fn() }))
// A lista é do cliente e tem teste próprio: aqui só importa o que a página decide.
jest.mock("@/components/datasets/tabela-datasets", () => ({
  TabelaDatasets: () => <p>Lista de datasets</p>,
}))

const ANALISTA: SessaoValida = {
  usuario: "analista",
  nome: "Analista Demo",
  papel: "analista",
}

describe("página Datasets", () => {
  it("exige o papel de analista para o caminho /saude/datasets", async () => {
    jest
      .mocked(exigirPapelNaPagina)
      .mockResolvedValue({ tipo: "ok", sessao: ANALISTA })

    await PaginaDatasets()

    expect(exigirPapelNaPagina).toHaveBeenCalledWith(
      "analista",
      "/saude/datasets"
    )
  })

  it("para o analista, mostra o título, o caminho para importar e a lista", async () => {
    jest
      .mocked(exigirPapelNaPagina)
      .mockResolvedValue({ tipo: "ok", sessao: ANALISTA })

    render(await PaginaDatasets())

    expect(
      screen.getByRole("heading", { level: 1, name: "Datasets" })
    ).toBeVisible()
    expect(screen.getByRole("link", { name: "Importar CSV" })).toHaveAttribute(
      "href",
      "/saude/importar"
    )
    expect(screen.getByText("Lista de datasets")).toBeVisible()
  })

  it("sem permissão mostra o estado e nenhum conteúdo da lista", async () => {
    jest
      .mocked(exigirPapelNaPagina)
      .mockResolvedValue({ tipo: "sem-permissao" })

    render(await PaginaDatasets())

    expect(screen.getByRole("heading", { name: "Sem permissão" })).toBeVisible()
    expect(screen.queryByText("Lista de datasets")).toBeNull()
  })
})
