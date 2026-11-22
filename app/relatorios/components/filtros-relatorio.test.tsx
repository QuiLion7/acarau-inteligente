import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { FiltrosRelatorio } from "@/app/relatorios/components/filtros-relatorio"
import { listarResumoBairros } from "@/lib/server/territorio/territorio-repositorio"
import "@/test/polyfill-pointer-event"

const replace = jest.fn()
let consulta = ""

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/relatorios",
  useSearchParams: () => new URLSearchParams(consulta),
}))

const bairros = listarResumoBairros()

function renderizar(periodos: string[] | null, parametros = "") {
  consulta = parametros
  return render(<FiltrosRelatorio bairros={bairros} periodos={periodos} />)
}

beforeEach(() => jest.clearAllMocks())

describe("FiltrosRelatorio (RF-05.02, DV-34)", () => {
  it("mostra o seletor de bairro (Todos os bairros) e o de período com o mais recente marcado", () => {
    renderizar(["2025", "2026"])

    expect(screen.getByRole("combobox", { name: "Bairro" })).toHaveValue(
      "Todos os bairros"
    )
    expect(screen.getByRole("combobox", { name: "Período" })).toHaveTextContent(
      "2026"
    )
  })

  it("escolher outro período o escreve na URL e preserva o bairro e a versão", async () => {
    const usuario = userEvent.setup()
    renderizar(["2025", "2026"], "bairro=uv-10&versao=v-1")

    await usuario.click(screen.getByRole("combobox", { name: "Período" }))
    await usuario.click(await screen.findByRole("option", { name: "2025" }))

    expect(replace).toHaveBeenCalledWith(
      "/relatorios?bairro=uv-10&versao=v-1&periodo=2025",
      { scroll: false }
    )
  })

  it("sem dataset (períodos nulos) só há o seletor de bairro", () => {
    renderizar(null)

    expect(screen.getByRole("combobox", { name: "Bairro" })).toBeVisible()
    expect(screen.queryByRole("combobox", { name: "Período" })).toBeNull()
  })

  it("bairro que não é reconhecido mostra o aviso e 'Limpar bairro' tira o bairro da URL", async () => {
    const usuario = userEvent.setup()
    renderizar(["2025", "2026"], "bairro=nao-existe&periodo=2025")

    expect(
      screen.getByRole("heading", { name: "Bairro não reconhecido" })
    ).toBeVisible()
    await usuario.click(screen.getByRole("button", { name: "Limpar bairro" }))

    expect(replace).toHaveBeenCalledWith("/relatorios?periodo=2025", {
      scroll: false,
    })
  })

  it("período sem dados oferece 'Limpar período', que volta ao mais recente", async () => {
    const usuario = userEvent.setup()
    renderizar(["2025", "2026"], "periodo=1999&bairro=uv-10")

    await usuario.click(screen.getByRole("button", { name: "Limpar período" }))

    expect(replace).toHaveBeenCalledWith("/relatorios?bairro=uv-10", {
      scroll: false,
    })
  })

  it("com período válido não oferece 'Limpar período'", () => {
    renderizar(["2025", "2026"], "periodo=2025")

    expect(screen.queryByRole("button", { name: "Limpar período" })).toBeNull()
  })
})
