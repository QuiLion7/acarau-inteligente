import { render, screen } from "@testing-library/react"

import PaginaAuditoria from "@/app/admin/auditoria/page"
import type { SessaoValida } from "@/lib/auth/papeis"
import { lerAmbiente } from "@/lib/config/ambiente"
import type { PaginaAuditoria as Pagina } from "@/lib/auditoria/tipos-auditoria"
import { listarEventos } from "@/lib/server/auditoria/auditoria-repositorio"
import { exigirPapelNaPagina } from "@/lib/server/auth/dal"
import { criarAmbienteDeTeste } from "@/test/ambiente-teste"

jest.mock("@/lib/server/auth/dal", () => ({ exigirPapelNaPagina: jest.fn() }))
jest.mock("@/lib/server/db/cliente", () => ({
  obterBanco: jest.fn(() => ({})),
}))
jest.mock("@/lib/server/auditoria/auditoria-repositorio", () => ({
  listarEventos: jest.fn(),
}))
jest.mock("@/lib/config/ambiente", () => ({ lerAmbiente: jest.fn() }))
// Filtros e tabela são do cliente e têm teste próprio: aqui só importa o que a página decide e entrega a eles.
jest.mock("@/app/admin/auditoria/components/filtros-auditoria", () => ({
  FiltrosAuditoriaForm: ({
    filtros,
    contas,
    haFiltro,
  }: {
    filtros: { tipo: string | null; conta: string | null; pagina: number }
    contas: unknown[]
    haFiltro: boolean
  }) => (
    <p>
      Filtros: tipo {filtros.tipo ?? "todos"}, conta {filtros.conta ?? "todas"},
      página {filtros.pagina}; {contas.length} contas; filtro{" "}
      {haFiltro ? "ativo" : "inativo"}
    </p>
  ),
}))
jest.mock("@/app/admin/auditoria/components/tabela-auditoria", () => ({
  TabelaAuditoria: ({ pagina }: { pagina: Pagina }) => (
    <p>
      Tabela: {pagina.eventos.length} eventos de {pagina.total}, página{" "}
      {pagina.pagina}
    </p>
  ),
}))

const ADMIN: SessaoValida = {
  usuario: "admin-teste",
  nome: "Administrador Demo",
  papel: "administrador",
}

function paginaDeEventos(sobrescritas: Partial<Pagina> = {}): Pagina {
  return { eventos: [], total: 0, paginas: 1, pagina: 1, ...sobrescritas }
}

async function abrir(parametros: Record<string, string | string[]> = {}) {
  render(await PaginaAuditoria({ searchParams: Promise.resolve(parametros) }))
}

beforeEach(async () => {
  jest.clearAllMocks()
  jest.mocked(lerAmbiente).mockReturnValue(await criarAmbienteDeTeste())
  jest
    .mocked(exigirPapelNaPagina)
    .mockResolvedValue({ tipo: "ok", sessao: ADMIN })
  jest.mocked(listarEventos).mockResolvedValue(paginaDeEventos())
})

describe("página Auditoria (RF-05.26, CA-05.17)", () => {
  it("exige o papel de administrador para o caminho /admin/auditoria", async () => {
    await abrir()

    expect(exigirPapelNaPagina).toHaveBeenCalledWith(
      "administrador",
      "/admin/auditoria"
    )
  })

  it("quem não é administrador recebe 'sem permissão' e nenhum evento é lido", async () => {
    jest
      .mocked(exigirPapelNaPagina)
      .mockResolvedValue({ tipo: "sem-permissao" })

    await abrir()

    expect(
      screen.getByRole("heading", { level: 1, name: "Sem permissão" })
    ).toBeVisible()
    expect(listarEventos).not.toHaveBeenCalled()
    expect(screen.queryByText(/Tabela:/)).toBeNull()
  })

  it("lê os eventos com os filtros da URL, ignorando os inválidos, e entrega as duas contas do ambiente", async () => {
    jest
      .mocked(listarEventos)
      .mockResolvedValue(
        paginaDeEventos({ total: 40, paginas: 2, pagina: 2, eventos: [] })
      )

    await abrir({ tipo: "obra_editada", conta: "intruso", pagina: "2" })

    expect(listarEventos).toHaveBeenCalledWith(
      expect.anything(),
      { tipo: "obra_editada", conta: null, de: null, ate: null, pagina: 2 },
      [
        { usuario: "analista-teste", nome: "Analista Demo" },
        { usuario: "admin-teste", nome: "Administrador Demo" },
      ]
    )
    expect(
      screen.getByText(
        /tipo obra_editada, conta todas, página 2; 2 contas; filtro ativo/
      )
    ).toBeVisible()
  })

  it("mostra o título e a tabela com os eventos da página", async () => {
    jest.mocked(listarEventos).mockResolvedValue(
      paginaDeEventos({
        total: 1,
        eventos: [
          {
            id: "1",
            ocorridoEm: "2026-11-21T14:05:00.000Z",
            tipo: "logout",
            rotulo: "Saída",
            conta: "analista-teste",
            contaRotulo: "Analista Demo",
            resultado: "sucesso",
            alvo: null,
            detalhes: {},
          },
        ],
      })
    )

    await abrir()

    expect(
      screen.getByRole("heading", { level: 1, name: "Auditoria" })
    ).toBeVisible()
    expect(screen.getByText("Tabela: 1 eventos de 1, página 1")).toBeVisible()
    expect(
      screen.getByRole("link", { name: "Voltar à Administração" })
    ).toHaveAttribute("href", "/admin")
  })

  it("página além da última mostra a última página", async () => {
    jest
      .mocked(listarEventos)
      .mockResolvedValueOnce(
        paginaDeEventos({ total: 30, paginas: 2, pagina: 9 })
      )
      .mockResolvedValueOnce(
        paginaDeEventos({ total: 30, paginas: 2, pagina: 2 })
      )

    await abrir({ pagina: "9" })

    expect(listarEventos).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ pagina: 2 }),
      expect.anything()
    )
    expect(screen.getByText(/página 2$/)).toBeVisible()
  })

  it("com o banco fora do ar mostra o estado de erro e registra a falha uma vez", async () => {
    const escrita = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true)
    jest.mocked(listarEventos).mockRejectedValue(new Error("conexão recusada"))

    await abrir()

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar"
    )
    expect(screen.queryByText(/Tabela:/)).toBeNull()
    const eventos = escrita.mock.calls
      .map(([linha]) => JSON.parse(String(linha)))
      .filter(({ evento }) => evento === "auditoria.leitura_falhou")
    expect(eventos).toHaveLength(1)
  })
})
