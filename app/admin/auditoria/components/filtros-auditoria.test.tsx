import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { FiltrosAuditoriaForm } from "@/app/admin/auditoria/components/filtros-auditoria"
import type { FiltrosAuditoria } from "@/lib/auditoria/tipos-auditoria"
import "@/test/polyfill-pointer-event"

const replace = jest.fn()
let consulta = ""

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/admin/auditoria",
  useSearchParams: () => new URLSearchParams(consulta),
}))

const CONTAS = [
  { usuario: "analista", nome: "Analista Demo" },
  { usuario: "admin", nome: "Administrador Demo" },
]
const SEM_FILTRO: FiltrosAuditoria = {
  tipo: null,
  conta: null,
  de: null,
  ate: null,
  pagina: 1,
}

function renderizar(
  filtros: Partial<FiltrosAuditoria> = {},
  parametros = "",
  haFiltro = false
) {
  consulta = parametros
  return render(
    <FiltrosAuditoriaForm
      filtros={{ ...SEM_FILTRO, ...filtros }}
      contas={CONTAS}
      haFiltro={haFiltro}
    />
  )
}

beforeEach(() => {
  replace.mockClear()
})

describe("FiltrosAuditoriaForm (RF-05.27)", () => {
  it("mostra os quatro filtros com rótulo e o valor atual, sem 'Limpar filtros' enquanto não há filtro", () => {
    renderizar({ tipo: "obra_editada", conta: "analista" }, "", false)

    expect(
      screen.getByRole("combobox", { name: "Tipo de evento" })
    ).toHaveTextContent("Obra editada")
    expect(screen.getByRole("combobox", { name: "Conta" })).toHaveTextContent(
      "Analista Demo"
    )
    expect(screen.getByLabelText("De")).toHaveValue("")
    expect(screen.getByLabelText("Até")).toHaveValue("")
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).toBeNull()
  })

  it("escolher um tipo o escreve na URL, preserva o resto e volta para a primeira página", async () => {
    const usuario = userEvent.setup()
    renderizar({}, "conta=admin&pagina=3")

    await usuario.click(
      screen.getByRole("combobox", { name: "Tipo de evento" })
    )
    await usuario.click(
      await screen.findByRole("option", { name: "Obra editada" })
    )

    expect(replace).toHaveBeenCalledWith(
      "/admin/auditoria?conta=admin&tipo=obra_editada",
      { scroll: false }
    )
  })

  it("oferece as contas do ambiente e 'Conta desconhecida', e escolher 'Todas as contas' tira o parâmetro", async () => {
    const usuario = userEvent.setup()
    renderizar({ conta: "admin" }, "conta=admin")

    await usuario.click(screen.getByRole("combobox", { name: "Conta" }))
    expect(
      await screen.findByRole("option", { name: "Conta desconhecida" })
    ).toBeVisible()
    await usuario.click(screen.getByRole("option", { name: "Todas as contas" }))

    expect(replace).toHaveBeenCalledWith("/admin/auditoria", { scroll: false })
  })

  it("preencher o período escreve de e ate na URL, e esvaziar o campo tira o parâmetro", () => {
    renderizar({ de: "2026-11-01" }, "de=2026-11-01", true)

    fireEvent.change(screen.getByLabelText("Até"), {
      target: { value: "2026-11-30" },
    })
    fireEvent.change(screen.getByLabelText("De"), { target: { value: "" } })

    expect(replace).toHaveBeenNthCalledWith(
      1,
      "/admin/auditoria?de=2026-11-01&ate=2026-11-30",
      { scroll: false }
    )
    expect(replace).toHaveBeenNthCalledWith(2, "/admin/auditoria", {
      scroll: false,
    })
  })

  it("'Limpar filtros' tira tipo, conta, período e página da URL", async () => {
    const usuario = userEvent.setup()
    renderizar(
      { tipo: "logout" },
      "tipo=logout&conta=admin&de=2026-11-01&ate=2026-11-02&pagina=2&outro=1",
      true
    )

    await usuario.click(screen.getByRole("button", { name: "Limpar filtros" }))

    expect(replace).toHaveBeenCalledWith("/admin/auditoria?outro=1", {
      scroll: false,
    })
  })
})
