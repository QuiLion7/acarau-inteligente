import { render, screen } from "@testing-library/react"

import PaginaImportarCsv from "@/app/saude/importar/page"
import type { SessaoValida } from "@/lib/auth/papeis"
import { exigirPapelNaPagina } from "@/lib/server/auth/dal"

jest.mock("@/lib/server/auth/dal", () => ({ exigirPapelNaPagina: jest.fn() }))
// O assistente é do cliente e tem teste próprio: aqui só importa o que a página decide e entrega a ele.
jest.mock("@/components/importacao/assistente-importacao", () => ({
  AssistenteImportacao: ({ bairros }: { bairros: unknown[] }) => (
    <p>Assistente com {bairros.length} bairros</p>
  ),
}))

const ANALISTA: SessaoValida = {
  usuario: "analista",
  nome: "Analista Demo",
  papel: "analista",
}

describe("página Importar CSV", () => {
  it("exige o papel de analista para o caminho /saude/importar", async () => {
    jest
      .mocked(exigirPapelNaPagina)
      .mockResolvedValue({ tipo: "ok", sessao: ANALISTA })

    await PaginaImportarCsv()

    expect(exigirPapelNaPagina).toHaveBeenCalledWith(
      "analista",
      "/saude/importar"
    )
  })

  it("para o analista, mostra o título e entrega os 24 bairros ao assistente", async () => {
    jest
      .mocked(exigirPapelNaPagina)
      .mockResolvedValue({ tipo: "ok", sessao: ANALISTA })

    render(await PaginaImportarCsv())

    expect(
      screen.getByRole("heading", { level: 1, name: "Importar CSV" })
    ).toBeVisible()
    expect(screen.getByText("Assistente com 24 bairros")).toBeVisible()
  })

  it("quem não tem o papel recebe o estado sem permissão e nada do assistente", async () => {
    jest
      .mocked(exigirPapelNaPagina)
      .mockResolvedValue({ tipo: "sem-permissao" })

    render(await PaginaImportarCsv())

    expect(
      screen.getByRole("heading", { level: 1, name: "Sem permissão" })
    ).toBeVisible()
    expect(screen.queryByText(/Assistente com/)).toBeNull()
    expect(screen.queryByRole("heading", { name: "Importar CSV" })).toBeNull()
  })
})
