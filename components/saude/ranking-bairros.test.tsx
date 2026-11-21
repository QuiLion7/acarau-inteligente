import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { RankingBairros } from "@/components/saude/ranking-bairros"
import { ordenarRanking } from "@/lib/saude/ranking"
import { BAIRROS_SAUDE, itemDoBairro } from "@/test/saude-fixtures"

const [OUTRA_BANDA, CENTRO, RODAGEM, MORADA] = BAIRROS_SAUDE as [
  (typeof BAIRROS_SAUDE)[number],
  (typeof BAIRROS_SAUDE)[number],
  (typeof BAIRROS_SAUDE)[number],
  (typeof BAIRROS_SAUDE)[number],
]

function renderizar(
  selecionadoId: string | null = null,
  onSelecionar = jest.fn()
) {
  const { ranking, semDados } = ordenarRanking([
    itemDoBairro(OUTRA_BANDA, 12),
    itemDoBairro(CENTRO, 9),
    itemDoBairro(RODAGEM, 9),
    itemDoBairro(MORADA, null),
  ])
  render(
    <RankingBairros
      ranking={ranking}
      semDados={semDados}
      selecionadoId={selecionadoId}
      onSelecionar={onSelecionar}
    />
  )
  return onSelecionar
}

describe("RankingBairros (TU-26, CA-02.22)", () => {
  it("mostra a regra de ordenação escrita e os bairros do maior ao menor, com empate em ordem alfabética", () => {
    renderizar()

    expect(
      screen.getByText(
        "Ordem: mais casos primeiro; empate em ordem alfabética do nome do bairro."
      )
    ).toBeVisible()
    const itens = within(screen.getByRole("list")).getAllByRole("listitem")
    expect(itens.map((item) => item.textContent)).toEqual([
      "Outra Banda12 casos",
      "Centro9 casos",
      "Rodagem9 casos",
    ])
  })

  it("cita à parte os bairros sem dados, fora da ordem", () => {
    renderizar()

    expect(
      screen.getByText(
        "Sem dados no período, fora do ranking: Morada dos Ventos."
      )
    ).toBeVisible()
    expect(
      within(screen.getByRole("list")).queryByText("Morada dos Ventos")
    ).toBeNull()
  })

  it("destaca o bairro selecionado e seleciona pelo botão do nome", async () => {
    const usuario = userEvent.setup()
    const onSelecionar = renderizar("uv-10")

    expect(screen.getByRole("button", { name: "Centro" })).toHaveAttribute(
      "aria-current",
      "true"
    )
    expect(screen.getByRole("button", { name: "Rodagem" })).not.toHaveAttribute(
      "aria-current"
    )

    await usuario.click(screen.getByRole("button", { name: "Rodagem" }))

    expect(onSelecionar).toHaveBeenCalledWith("uv-13")
  })

  it("sem nenhum bairro com dados diz isso, sem lista", () => {
    render(
      <RankingBairros
        ranking={[]}
        semDados={[CENTRO]}
        selecionadoId={null}
        onSelecionar={jest.fn()}
      />
    )

    expect(
      screen.getByText("Nenhum bairro tem dados no período.")
    ).toBeVisible()
    expect(screen.queryByRole("list")).toBeNull()
  })
})
