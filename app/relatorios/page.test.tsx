import { render, screen } from "@testing-library/react"

import PaginaRelatorios from "@/app/relatorios/page"
import type { SessaoValida } from "@/lib/auth/papeis"
import type { RelatorioDados } from "@/lib/relatorios/tipos-relatorio"
import { obterSessaoAtual } from "@/lib/server/auth/dal"
import { montarRelatorio } from "@/lib/server/relatorios/relatorio-servico"
import { ANALISE_SAUDE } from "@/test/saude-fixtures"
import { relatorioDeTeste } from "@/test/relatorio-fixtures"

jest.mock("@/lib/server/auth/dal", () => ({ obterSessaoAtual: jest.fn() }))
jest.mock("@/lib/server/db/cliente", () => ({
  obterBanco: jest.fn(() => ({})),
}))
jest.mock("@/lib/server/relatorios/relatorio-servico", () => ({
  montarRelatorio: jest.fn(),
}))
jest.mock("@/components/relatorios/botao-gerar-pdf", () => ({
  BotaoGerarPdf: ({ dados }: { dados: RelatorioDados }) => (
    <button>Gerar PDF de {dados.autor}</button>
  ),
}))
// Prévia e filtros têm teste próprio: aqui só importa o que a página decide e entrega a eles.
jest.mock("@/components/relatorios/previa-relatorio", () => ({
  PreviaRelatorio: ({ dados }: { dados: RelatorioDados }) => (
    <p>Prévia de {dados.autor}</p>
  ),
}))
jest.mock("@/app/relatorios/components/filtros-relatorio", () => ({
  FiltrosRelatorio: ({
    bairros,
    periodos,
  }: {
    bairros: unknown[]
    periodos: string[] | null
  }) => (
    <p>
      Filtros com {bairros.length} bairros e períodos{" "}
      {periodos ? periodos.join("+") : "nenhum"}
    </p>
  ),
}))

const ANALISTA: SessaoValida = {
  usuario: "analista",
  nome: "Analista Demo",
  papel: "analista",
}
const UUID = "6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f"

async function abrir(
  sessao: SessaoValida | null,
  parametros: Record<string, string | string[]> = {}
) {
  jest.mocked(obterSessaoAtual).mockResolvedValue(sessao)
  render(await PaginaRelatorios({ searchParams: Promise.resolve(parametros) }))
}

beforeEach(() => {
  jest.clearAllMocks()
  jest
    .mocked(montarRelatorio)
    .mockResolvedValue({ status: "ok", dados: relatorioDeTeste() })
})

describe("página Relatórios (CA-05.01, RN-05.05)", () => {
  it("deixa de ser 'em breve': título, filtros e prévia, para o visitante sem login", async () => {
    await abrir(null)

    expect(
      screen.getByRole("heading", { level: 1, name: "Relatórios" })
    ).toBeVisible()
    expect(screen.queryByText("Disponível em breve")).toBeNull()
    expect(
      screen.getByText("Filtros com 24 bairros e períodos 2025+2026")
    ).toBeVisible()
    expect(screen.getByText("Prévia de Visitante")).toBeVisible()
    expect(
      screen.getByRole("button", { name: "Gerar PDF de Visitante" })
    ).toBeVisible()
  })

  it("monta o relatório com os filtros e a versão da URL e com a sessão", async () => {
    await abrir(ANALISTA, { bairro: "uv-10", periodo: "2025", versao: UUID })

    expect(montarRelatorio).toHaveBeenCalledWith(expect.anything(), {
      filtros: { bairro: "uv-10", periodo: "2025" },
      versaoId: UUID,
      sessao: ANALISTA,
    })
  })

  it("sem parâmetros usa 'Todos' e nenhuma versão; versão fora do formato de uuid é ignorada", async () => {
    await abrir(null, { versao: "<script>" })

    expect(montarRelatorio).toHaveBeenCalledWith(expect.anything(), {
      filtros: { bairro: "Todos", periodo: "Todos" },
      versaoId: null,
      sessao: null,
    })
  })

  it("sem dataset o seletor de período não recebe lista", async () => {
    jest.mocked(montarRelatorio).mockResolvedValue({
      status: "ok",
      dados: relatorioDeTeste({ analise: null }),
    })

    await abrir(null)

    expect(screen.getByText(/períodos nenhum/)).toBeVisible()
  })

  it("com período sem dados o seletor ainda recebe os períodos que existem", async () => {
    jest.mocked(montarRelatorio).mockResolvedValue({
      status: "ok",
      dados: relatorioDeTeste({ analise: ANALISE_SAUDE, periodo: "1999" }),
    })

    await abrir(null, { periodo: "1999" })

    expect(screen.getByText(/períodos 2025\+2026/)).toBeVisible()
  })
})

describe("página Relatórios: versão não encontrada e erro (CA-05.07)", () => {
  it("versão privada pedida pelo visitante vira 'não encontrado', sem filtros nem prévia", async () => {
    jest
      .mocked(montarRelatorio)
      .mockResolvedValue({ status: "versao-nao-encontrada" })

    await abrir(null, { versao: UUID })

    expect(
      screen.getByRole("heading", { name: "Versão não encontrada" })
    ).toBeVisible()
    expect(
      screen.getByRole("link", { name: /relatório da versão publicada/ })
    ).toHaveAttribute("href", "/relatorios")
    expect(screen.queryByText(/Prévia de/)).toBeNull()
    expect(screen.queryByText(/Filtros com/)).toBeNull()
    expect(screen.queryByRole("button", { name: /Gerar PDF/ })).toBeNull()
  })

  it("com o banco fora do ar mostra o estado de erro e registra a falha uma vez", async () => {
    const escrita = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true)
    jest
      .mocked(montarRelatorio)
      .mockRejectedValue(new Error("conexão recusada"))

    await abrir(null)

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar"
    )
    expect(screen.queryByText(/Prévia de/)).toBeNull()
    const eventos = escrita.mock.calls
      .map(([linha]) => JSON.parse(String(linha)))
      .filter(({ evento }) => evento === "relatorio.montagem_falhou")
    expect(eventos).toHaveLength(1)
  })
})
