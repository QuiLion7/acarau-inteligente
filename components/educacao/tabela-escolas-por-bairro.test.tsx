import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { TabelaEscolasPorBairro } from "@/components/educacao/tabela-escolas-por-bairro"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

const { bairros, qualidade } = obterDadosTerritorio()

function renderizar(selecionadoId: string | null = null) {
  const onSelecionar = jest.fn()
  render(
    <TabelaEscolasPorBairro
      bairros={bairros}
      qualidade={qualidade}
      selecionadoId={selecionadoId}
      onSelecionar={onSelecionar}
    />
  )
  return onSelecionar
}

const linhaDe = (nome: string) =>
  screen.getByRole("row", { name: new RegExp(nome) })

describe("TabelaEscolasPorBairro (TU-22, CA-03.18, RN-03.07)", () => {
  it("lista os 24 bairros com o número de escolas de cada um", () => {
    renderizar()

    const corpo = screen.getAllByRole("rowgroup")[1]!
    expect(within(corpo).getAllByRole("row")).toHaveLength(24)
    expect(within(linhaDe("Centro")).getByText("8")).toBeVisible()
  })

  it("bairro sem escola mostra '0 na base disponível'", () => {
    const semEscola = bairros.find(({ totalEscolas }) => totalEscolas === 0)!
    renderizar()

    expect(
      within(linhaDe(semEscola.nome)).getByText("0 na base disponível")
    ).toBeVisible()
  })

  it("as linhas de fora da cobertura, fora do limite e sem localização ficam à parte, com 33, 1 e 4", () => {
    renderizar()

    const rodape = screen.getAllByRole("rowgroup")[2]!
    expect(within(rodape).getByText("Fora da soma dos bairros")).toBeVisible()
    for (const [rotulo, total] of [
      ["Fora da cobertura dos bairros", "33"],
      ["Fora do limite municipal", "1"],
      ["Sem localização", "4"],
    ]) {
      expect(
        within(
          within(rodape).getByRole("row", { name: new RegExp(rotulo!) })
        ).getByText(total!, { exact: true })
      ).toBeVisible()
    }
    expect(
      screen.getByText(/não entram na soma de nenhum bairro/)
    ).toBeVisible()
  })

  it("as 24 linhas somam 24 e, com as três de fora, o total das escolas é 62", () => {
    renderizar()

    const numero = (linha: HTMLElement) =>
      Number(
        within(linha)
          .getAllByRole("cell")
          .at(-1)
          ?.textContent?.replace(/\D.*/, "") || 0
      )
    const [, corpo, rodape] = screen.getAllByRole("rowgroup")
    const somaDosBairros = within(corpo!)
      .getAllByRole("row")
      .reduce((s, l) => s + numero(l), 0)
    const somaDeFora = within(rodape!)
      .getAllByRole("row")
      .slice(1)
      .reduce((s, l) => s + numero(l), 0)

    expect(somaDosBairros).toBe(24)
    expect(somaDosBairros + somaDeFora).toBe(62)
  })

  it("ordena pelo número de escolas, com o maior primeiro, e a ordem não mexe nas linhas de fora", async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(screen.getByRole("button", { name: /Escolas/ }))

    const corpo = screen.getAllByRole("rowgroup")[1]!
    expect(
      within(within(corpo).getAllByRole("row")[0]!).getByText("Centro")
    ).toBeVisible()
    expect(
      screen.getByRole("columnheader", { name: /Escolas/ })
    ).toHaveAttribute("aria-sort", "descending")
    expect(
      within(screen.getAllByRole("rowgroup")[2]!).getAllByRole("row")
    ).toHaveLength(4)
  })

  it("destaca o bairro selecionado e escolher pelo nome avisa o ID", async () => {
    const usuario = userEvent.setup()
    const onSelecionar = renderizar("uv-10")

    expect(linhaDe("Centro")).toHaveAttribute("data-state", "selected")
    await usuario.click(
      within(linhaDe("Rodagem")).getByRole("button", { name: "Rodagem" })
    )

    expect(onSelecionar).toHaveBeenCalledWith("uv-13")
  })
})
