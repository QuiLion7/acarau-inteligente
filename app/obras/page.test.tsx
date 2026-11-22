import { render, screen } from "@testing-library/react"

import CarregandoObras from "@/app/obras/loading"
import PaginaObras from "@/app/obras/page"
import { montarObra } from "@/lib/obras/__fixtures__/obra"
import type { SessaoValida } from "@/lib/auth/papeis"
import { obterSessaoAtual } from "@/lib/server/auth/dal"
import { listarObras } from "@/lib/server/obras/obra-repositorio"

jest.mock("@/lib/server/auth/dal", () => ({ obterSessaoAtual: jest.fn() }))
jest.mock("@/lib/server/db/cliente", () => ({
  obterBanco: jest.fn(() => ({})),
}))
jest.mock("@/lib/server/obras/obra-repositorio", () => ({
  listarObras: jest.fn(),
}))
// O painel é do cliente e tem teste próprio: aqui só importa o que a página decide e entrega a ele.
jest.mock("@/components/obras/painel-obras", () => ({
  PainelObras: ({
    obras,
    bairros,
    regraFronteira,
    podeEditar,
    abrirNova,
    obraInicialId,
  }: {
    obras: unknown[]
    bairros: unknown[]
    regraFronteira: string
    podeEditar: boolean
    abrirNova: boolean
    obraInicialId?: string | null
  }) => (
    <p>
      Painel com {obras.length} obras, {bairros.length} bairros e a regra{" "}
      {regraFronteira ? "do artefato" : "ausente"}; edição{" "}
      {podeEditar ? "liberada" : "bloqueada"}; nova obra{" "}
      {abrirNova ? "aberta" : "fechada"}; ficha {obraInicialId ?? "nenhuma"}
    </p>
  ),
}))

const ANALISTA: SessaoValida = {
  usuario: "analista",
  nome: "Analista Demo",
  papel: "analista",
}

async function abrir(
  sessao: SessaoValida | null,
  parametros: Record<string, string | string[]> = {}
) {
  jest.mocked(obterSessaoAtual).mockResolvedValue(sessao)
  render(await PaginaObras({ searchParams: Promise.resolve(parametros) }))
}

describe("página Obras (PA-04.01)", () => {
  it("deixa de ser 'em breve': título, descrição e o painel com as obras e os 24 bairros", async () => {
    jest.mocked(listarObras).mockResolvedValue([montarObra(), montarObra()])

    await abrir(null)

    expect(
      screen.getByRole("heading", { level: 1, name: "Obras" })
    ).toBeVisible()
    expect(screen.queryByText("Disponível em breve")).toBeNull()
    expect(
      screen.getByText(/Painel com 2 obras, 24 bairros e a regra do artefato/)
    ).toBeVisible()
  })

  it("o visitante recebe a edição bloqueada, mesmo com nova=1 na URL (CA-04.22)", async () => {
    jest.mocked(listarObras).mockResolvedValue([])

    await abrir(null, { nova: "1" })

    expect(screen.getByText(/edição bloqueada; nova obra aberta/)).toBeVisible()
  })

  it("o analista recebe a edição liberada e nova=1 abre o formulário", async () => {
    jest.mocked(listarObras).mockResolvedValue([])

    await abrir(ANALISTA, { nova: "1" })

    expect(screen.getByText(/edição liberada; nova obra aberta/)).toBeVisible()
  })

  it("sem o parâmetro nova o formulário não abre", async () => {
    jest.mocked(listarObras).mockResolvedValue([])

    await abrir(ANALISTA)
    expect(screen.getByText(/edição liberada; nova obra fechada/)).toBeVisible()
  })

  it("nova com outro valor que não 1 não abre o formulário", async () => {
    jest.mocked(listarObras).mockResolvedValue([])

    await abrir(ANALISTA, { nova: "sim" })

    expect(screen.getByText(/edição liberada; nova obra fechada/)).toBeVisible()
  })

  it("com o banco fora do ar mostra o estado de erro, sem o painel, e registra a falha uma vez", async () => {
    const escrita = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true)
    jest.mocked(listarObras).mockRejectedValue(new Error("conexão recusada"))

    await abrir(null)

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar"
    )
    expect(screen.queryByText(/Painel com/)).toBeNull()
    const eventos = escrita.mock.calls
      .map(([linha]) => JSON.parse(String(linha)))
      .filter(({ evento }) => evento === "obras.leitura_falhou")
    expect(eventos).toHaveLength(1)
  })
})

describe("parâmetro obra (RF-05.28, CA-05.32)", () => {
  const ID_EXISTENTE = "6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f"
  const ID_AUSENTE = "11111111-2222-4333-8444-555555555555"

  it("abre a ficha da obra pedida quando ela existe", async () => {
    jest
      .mocked(listarObras)
      .mockResolvedValue([montarObra({ id: ID_EXISTENTE })])

    await abrir(null, { obra: ID_EXISTENTE })

    expect(screen.getByText(new RegExp(`ficha ${ID_EXISTENTE}`))).toBeVisible()
  })

  it.each([
    ["uuid de obra que não existe", ID_AUSENTE],
    ["texto que não é uuid", "../../etc/passwd"],
    ["valor vazio", ""],
  ])("ignora %s: a página abre como sempre", async (_nome, obra) => {
    jest
      .mocked(listarObras)
      .mockResolvedValue([montarObra({ id: ID_EXISTENTE })])

    await abrir(null, { obra })

    expect(screen.getByText(/ficha nenhuma/)).toBeVisible()
  })

  it("usa o primeiro valor quando o parâmetro vem repetido", async () => {
    jest
      .mocked(listarObras)
      .mockResolvedValue([montarObra({ id: ID_EXISTENTE })])

    await abrir(null, { obra: [ID_EXISTENTE, ID_AUSENTE] })

    expect(screen.getByText(new RegExp(`ficha ${ID_EXISTENTE}`))).toBeVisible()
  })
})

describe("loading de Obras", () => {
  it("mostra o estado de carregamento do catálogo", () => {
    render(<CarregandoObras />)

    expect(
      screen.getByRole("heading", { name: "Carregando as obras" })
    ).toBeVisible()
  })
})
