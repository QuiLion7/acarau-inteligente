import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { TabelaAuditoria } from "@/app/admin/auditoria/components/tabela-auditoria"
import type {
  EventoAuditoria,
  PaginaAuditoria,
} from "@/lib/auditoria/tipos-auditoria"

const replace = jest.fn()
let consulta = ""

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/admin/auditoria",
  useSearchParams: () => new URLSearchParams(consulta),
}))

const ID_OBRA = "6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f"
const ID_VERSAO = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d"

function evento(sobrescritas: Partial<EventoAuditoria> = {}): EventoAuditoria {
  return {
    id: "1",
    ocorridoEm: "2026-11-21T14:05:00.000Z",
    tipo: "login_sucesso",
    rotulo: "Entrada com sucesso",
    conta: "analista",
    contaRotulo: "Analista Demo",
    resultado: "sucesso",
    alvo: null,
    detalhes: {},
    ...sobrescritas,
  }
}

function pagina(
  eventos: EventoAuditoria[],
  sobrescritas: Partial<PaginaAuditoria> = {}
): PaginaAuditoria {
  return {
    eventos,
    total: eventos.length,
    paginas: 1,
    pagina: 1,
    ...sobrescritas,
  }
}

function renderizar(dados: PaginaAuditoria, haFiltro = false, parametros = "") {
  consulta = parametros
  return render(<TabelaAuditoria pagina={dados} haFiltro={haFiltro} />)
}

beforeEach(() => {
  replace.mockClear()
})

describe("TabelaAuditoria (RF-05.26, CA-05.15)", () => {
  it("mostra uma linha por evento com data no horário de Brasília, conta, evento, alvo e resultado, na ordem recebida", () => {
    renderizar(
      pagina([
        evento({
          id: "2",
          tipo: "obra_criada",
          rotulo: "Obra criada",
          alvo: { tipo: "obra", id: ID_OBRA, existe: true },
        }),
        evento({
          id: "1",
          ocorridoEm: "2026-11-21T13:00:00.000Z",
          tipo: "login_falha",
          rotulo: "Falha de login",
          conta: null,
          contaRotulo: "Conta desconhecida",
          resultado: "recusado",
        }),
      ])
    )

    const linhas = screen.getAllByRole("row").slice(1)
    expect(linhas).toHaveLength(2)
    expect(within(linhas[0]).getByText("21/11/2026 11:05")).toBeVisible()
    expect(within(linhas[0]).getByText("Obra criada")).toBeVisible()
    expect(within(linhas[0]).getByText("Sucesso")).toBeVisible()
    expect(within(linhas[1]).getByText("Conta desconhecida")).toBeVisible()
    expect(within(linhas[1]).getByText("Recusado")).toBeVisible()
    expect(screen.getByRole("status")).toHaveTextContent(
      "2 eventos - Página 1 de 1"
    )
  })

  it("o alvo existente é um link para a obra ou para a versão", () => {
    renderizar(
      pagina([
        evento({
          id: "2",
          alvo: { tipo: "obra", id: ID_OBRA, existe: true },
        }),
        evento({
          id: "1",
          alvo: { tipo: "dataset_versao", id: ID_VERSAO, existe: true },
        }),
      ])
    )

    expect(
      screen.getByRole("link", { name: /^Obra 6f1c2d3e/ })
    ).toHaveAttribute("href", `/obras?obra=${ID_OBRA}`)
    expect(
      screen.getByRole("link", { name: /^Versão de dataset 0a1b2c3d/ })
    ).toHaveAttribute("href", `/saude?versao=${ID_VERSAO}`)
  })

  it("alvo que o reset removeu aparece como texto 'removido pelo reset', sem link (CA-05.32)", () => {
    renderizar(
      pagina([evento({ alvo: { tipo: "obra", id: ID_OBRA, existe: false } })])
    )

    expect(screen.getByText(/removido pelo reset/)).toBeVisible()
    expect(screen.queryByRole("link")).toBeNull()
  })

  it("'Mostrar detalhes' expande a linha com os detalhes em português e 'Ocultar detalhes' a recolhe", async () => {
    const usuario = userEvent.setup()
    renderizar(
      pagina([
        evento({
          tipo: "demo_reiniciada",
          rotulo: "Demo reiniciada",
          detalhes: { datasetsRemovidos: 1, obrasRemovidas: 8 },
        }),
        evento({
          id: "2",
          tipo: "obra_editada",
          rotulo: "Obra editada",
          detalhes: { situacaoAlterada: true },
        }),
      ])
    )

    const [primeiro] = screen.getAllByRole("button", {
      name: "Mostrar detalhes",
    })
    await usuario.click(primeiro)

    expect(primeiro).toHaveAccessibleName("Ocultar detalhes")
    expect(primeiro).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("Datasets removidos")).toBeVisible()
    expect(screen.getByText("8")).toBeVisible()
    await usuario.click(primeiro)
    expect(screen.queryByText("Datasets removidos")).toBeNull()
  })

  it("mostra booleano como Sim ou Não e avisa quando não há detalhes", async () => {
    const usuario = userEvent.setup()
    renderizar(
      pagina([
        evento({ id: "2", detalhes: { situacaoAlterada: false } }),
        evento({ id: "1" }),
      ])
    )

    const botoes = screen.getAllByRole("button", { name: "Mostrar detalhes" })
    await usuario.click(botoes[0])
    await usuario.click(botoes[1])

    expect(screen.getByText("Situação alterada")).toBeVisible()
    expect(screen.getByText("Não")).toBeVisible()
    expect(screen.getByText("Sem detalhes adicionais.")).toBeVisible()
  })

  it("trata o texto do detalhe como texto, nunca como HTML", async () => {
    const usuario = userEvent.setup()
    renderizar(
      pagina([
        evento({
          tipo: "acesso_negado",
          rotulo: "Acesso negado",
          detalhes: { rota: "/api/<b>x</b>" },
        }),
      ])
    )

    await usuario.click(
      screen.getByRole("button", { name: "Mostrar detalhes" })
    )

    expect(screen.getByText("/api/<b>x</b>")).toBeVisible()
  })

  it("os botões de página levam à anterior e à próxima, preservando os filtros, e desligam nas pontas", async () => {
    const usuario = userEvent.setup()
    renderizar(
      pagina([evento()], { total: 60, paginas: 3, pagina: 2 }),
      true,
      "tipo=logout&pagina=2"
    )

    await usuario.click(screen.getByRole("button", { name: "Próxima página" }))
    await usuario.click(screen.getByRole("button", { name: "Página anterior" }))

    expect(replace).toHaveBeenNthCalledWith(
      1,
      "/admin/auditoria?tipo=logout&pagina=3",
      { scroll: false }
    )
    expect(replace).toHaveBeenNthCalledWith(2, "/admin/auditoria?tipo=logout", {
      scroll: false,
    })
  })

  it("na primeira página 'Página anterior' fica desligado, e na última 'Próxima página'", () => {
    const { unmount } = renderizar(
      pagina([evento()], { total: 30, paginas: 2 })
    )
    expect(
      screen.getByRole("button", { name: "Página anterior" })
    ).toBeDisabled()
    expect(screen.getByRole("button", { name: "Próxima página" })).toBeEnabled()
    unmount()

    renderizar(pagina([evento()], { total: 30, paginas: 2, pagina: 2 }))
    expect(
      screen.getByRole("button", { name: "Próxima página" })
    ).toBeDisabled()
  })

  it("com filtro sem resultado mostra 'Nenhum evento com estes filtros' e 'Limpar filtros' tira os filtros da URL (CA-05.18)", async () => {
    const usuario = userEvent.setup()
    renderizar(pagina([], { paginas: 1 }), true, "tipo=obra_editada&pagina=2")

    expect(
      screen.getByRole("heading", { name: "Nenhum evento com estes filtros" })
    ).toBeVisible()
    await usuario.click(screen.getByRole("button", { name: "Limpar filtros" }))

    expect(replace).toHaveBeenCalledWith("/admin/auditoria", { scroll: false })
  })

  it("sem filtro e sem eventos mostra o vazio sem ação", () => {
    renderizar(pagina([]))

    expect(
      screen.getByRole("heading", { name: "Nenhum evento registrado ainda" })
    ).toBeVisible()
    expect(screen.queryByRole("button")).toBeNull()
  })
})
