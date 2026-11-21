import { render, screen } from "@testing-library/react"

import PaginaSaude from "@/app/saude/page"
import type { SessaoValida } from "@/lib/auth/papeis"
import { obterSessaoAtual } from "@/lib/server/auth/dal"
import {
  montarAnaliseDataset,
  type ResultadoAnaliseDataset,
} from "@/lib/server/datasets/analise-dataset-servico"
import { ANALISE_SAUDE } from "@/test/saude-fixtures"

jest.mock("@/lib/server/auth/dal", () => ({ obterSessaoAtual: jest.fn() }))
jest.mock("@/lib/server/db/cliente", () => ({
  obterBanco: jest.fn(() => ({})),
}))
jest.mock("@/lib/server/datasets/analise-dataset-servico", () => ({
  montarAnaliseDataset: jest.fn(),
}))
// A análise é do cliente e tem teste próprio: aqui só importa o que a página decide e entrega a ela.
jest.mock("@/components/saude/analise-saude", () => ({
  AnaliseSaude: ({
    analise,
    mapa,
  }: {
    analise: { dataset: { nome: string } }
    mapa: { bairros: unknown[] }
  }) => (
    <p>
      Análise de {analise.dataset.nome} com {mapa.bairros.length} bairros
    </p>
  ),
}))

const ANALISTA: SessaoValida = {
  usuario: "analista",
  nome: "Analista Demo",
  papel: "analista",
}
const VERSAO = "7d0c2b8e-1f3a-4c55-9a0e-2d5b8f7c4e10"

async function abrir(
  resultado: ResultadoAnaliseDataset,
  sessao: SessaoValida | null,
  parametros: Record<string, string | string[]> = {}
) {
  jest.mocked(obterSessaoAtual).mockResolvedValue(sessao)
  jest.mocked(montarAnaliseDataset).mockResolvedValue(resultado)
  render(await PaginaSaude({ searchParams: Promise.resolve(parametros) }))
}

describe("página Saúde (PA-02.01)", () => {
  it("deixa de ser 'em breve': mostra o título e a análise com os 24 bairros", async () => {
    await abrir({ status: "ok", analise: ANALISE_SAUDE }, null)

    expect(
      screen.getByRole("heading", { level: 1, name: "Saúde" })
    ).toBeVisible()
    expect(screen.queryByText("Disponível em breve")).toBeNull()
    expect(
      screen.getByText("Análise de Roteiro 2025-2026 com 24 bairros")
    ).toBeVisible()
  })

  it("sem sessão, a consulta é feita como visitante", async () => {
    await abrir({ status: "ok", analise: ANALISE_SAUDE }, null)

    expect(montarAnaliseDataset).toHaveBeenCalledWith(expect.anything(), {
      versaoId: null,
      papel: "visitante",
    })
  })

  it("com sessão, a consulta usa o papel da sessão e a versão da URL", async () => {
    await abrir({ status: "ok", analise: ANALISE_SAUDE }, ANALISTA, {
      versao: VERSAO,
    })

    expect(montarAnaliseDataset).toHaveBeenCalledWith(expect.anything(), {
      versaoId: VERSAO,
      papel: "analista",
    })
  })

  it.each([
    ["fora do formato de uuid", "nao-e-uuid"],
    ["lista de valores com o primeiro inválido", ["x", VERSAO]],
  ])("versão %s conta como ausente", async (_caso, versao) => {
    await abrir({ status: "ok", analise: ANALISE_SAUDE }, null, { versao })

    expect(montarAnaliseDataset).toHaveBeenCalledWith(expect.anything(), {
      versaoId: null,
      papel: "visitante",
    })
  })

  it("sem dataset, o visitante vê o vazio sem o caminho para importar (CA-02.30)", async () => {
    await abrir({ status: "nenhum-dataset" }, null)

    expect(
      screen.getByRole("heading", { name: "Nenhum dataset publicado" })
    ).toBeVisible()
    expect(screen.queryByRole("link", { name: "Importar CSV" })).toBeNull()
  })

  it("sem dataset, o analista vê o vazio com o caminho para importar (CA-02.30)", async () => {
    await abrir({ status: "nenhum-dataset" }, ANALISTA)

    expect(
      screen.getByRole("heading", { name: "Nenhum dataset importado" })
    ).toBeVisible()
    expect(screen.getByRole("link", { name: "Importar CSV" })).toHaveAttribute(
      "href",
      "/saude/importar"
    )
  })

  it("versão não encontrada mostra o estado com o link para o dataset publicado", async () => {
    await abrir({ status: "nao-encontrada" }, null, { versao: VERSAO })

    expect(
      screen.getByRole("heading", { name: "Dataset não encontrado" })
    ).toBeVisible()
    expect(
      screen.getByRole("link", { name: "Ver o dataset publicado" })
    ).toHaveAttribute("href", "/saude")
    expect(screen.queryByText(/Análise de/)).toBeNull()
  })
})
