import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { AbasAnalise } from "@/components/saude/abas-analise"

function renderizar() {
  render(
    <AbasAnalise
      mapa={<p>conteúdo do mapa</p>}
      tabela={<button type="button">conteúdo da tabela</button>}
    />
  )
}

describe("AbasAnalise (TU-15, CA-03.10, CA-03.12)", () => {
  it("abre na aba Mapa e mostra só o painel dela", () => {
    renderizar()

    expect(screen.getByRole("tab", { name: "Mapa" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    expect(screen.getByText("conteúdo do mapa")).toBeVisible()
    expect(screen.queryByText("conteúdo da tabela")).toBeNull()
  })

  it("ativar a aba Tabela troca o painel e leva o foco ao painel da aba", async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(screen.getByRole("tab", { name: "Tabela" }))

    expect(screen.getByText("conteúdo da tabela")).toBeVisible()
    expect(screen.queryByText("conteúdo do mapa")).toBeNull()
    expect(screen.getByRole("tabpanel", { name: "Tabela" })).toHaveFocus()
  })

  it("só com o teclado: a seta percorre as abas sem ativar nem tirar o foco da lista, e Enter ativa e foca o painel", async () => {
    const usuario = userEvent.setup()
    renderizar()
    screen.getByRole("tab", { name: "Mapa" }).focus()

    await usuario.keyboard("{ArrowRight}")

    expect(screen.getByRole("tab", { name: "Tabela" })).toHaveFocus()
    expect(screen.getByText("conteúdo do mapa")).toBeVisible()

    await usuario.keyboard("{Enter}")

    expect(screen.getByText("conteúdo da tabela")).toBeVisible()
    expect(screen.getByRole("tabpanel", { name: "Tabela" })).toHaveFocus()
  })

  it("voltar à aba Mapa também leva o foco ao painel dela", async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(screen.getByRole("tab", { name: "Tabela" }))

    await usuario.click(screen.getByRole("tab", { name: "Mapa" }))

    expect(screen.getByRole("tabpanel", { name: "Mapa" })).toHaveFocus()
  })
})
