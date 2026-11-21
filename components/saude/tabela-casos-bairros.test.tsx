import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { TabelaCasosBairros } from "@/components/saude/tabela-casos-bairros"
import { BAIRROS_SAUDE, itemDoBairro } from "@/test/saude-fixtures"

const ITENS = [
  itemDoBairro(BAIRROS_SAUDE[0]!, 12),
  itemDoBairro(BAIRROS_SAUDE[1]!, 1234),
  itemDoBairro(BAIRROS_SAUDE[2]!, null),
  itemDoBairro(BAIRROS_SAUDE[3]!, 0),
]

function nomesNaOrdem(): string[] {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((linha) => within(linha).getAllByRole("cell")[1]?.textContent ?? "")
}

function renderizar(
  selecionadoId: string | null = null,
  onSelecionar = jest.fn()
) {
  render(
    <TabelaCasosBairros
      itens={ITENS}
      selecionadoId={selecionadoId}
      onSelecionar={onSelecionar}
    />
  )
  return onSelecionar
}

describe("TabelaCasosBairros (TU-26, CA-02.22)", () => {
  it("mostra todos os bairros recebidos, com sem dados em texto e o zero como zero", () => {
    renderizar()

    expect(screen.getAllByRole("row")).toHaveLength(ITENS.length + 1)
    const rodagem = screen.getByRole("row", { name: /Rodagem/ })
    expect(within(rodagem).getByText("sem dados")).toBeVisible()
    const morada = screen.getByRole("row", { name: /Morada dos Ventos/ })
    expect(within(morada).getByText("0")).toBeVisible()
    expect(
      within(screen.getByRole("row", { name: /Centro/ })).getByText("1.234")
    ).toBeVisible()
  })

  it("abre ordenada por UV", () => {
    renderizar()

    expect(nomesNaOrdem()).toEqual([
      "Outra Banda",
      "Centro",
      "Rodagem",
      "Morada dos Ventos",
    ])
  })

  it("ordena por casos nos dois sentidos e deixa o sem dados sempre por último", async () => {
    const usuario = userEvent.setup()
    renderizar()
    const cabecalho = screen.getByRole("button", { name: "Casos" })

    // Numérica: o primeiro clique ordena do maior para o menor.
    await usuario.click(cabecalho)
    expect(nomesNaOrdem()).toEqual([
      "Centro",
      "Outra Banda",
      "Morada dos Ventos",
      "Rodagem",
    ])
    expect(screen.getByRole("columnheader", { name: "Casos" })).toHaveAttribute(
      "aria-sort",
      "descending"
    )

    await usuario.click(cabecalho)
    expect(nomesNaOrdem()).toEqual([
      "Morada dos Ventos",
      "Outra Banda",
      "Centro",
      "Rodagem",
    ])
    expect(screen.getByRole("columnheader", { name: "Casos" })).toHaveAttribute(
      "aria-sort",
      "ascending"
    )
  })

  it("destaca o bairro selecionado e seleciona pelo botão do nome", async () => {
    const usuario = userEvent.setup()
    const onSelecionar = renderizar("uv-10")

    const centro = screen.getByRole("row", { name: /Centro/ })
    expect(centro).toHaveAttribute("data-state", "selected")
    expect(
      within(centro).getByRole("button", { name: "Centro" })
    ).toHaveAttribute("aria-current", "true")

    await usuario.click(screen.getByRole("button", { name: "Rodagem" }))

    expect(onSelecionar).toHaveBeenCalledWith("uv-13")
  })
})
