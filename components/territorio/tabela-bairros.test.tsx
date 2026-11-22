import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { baixarBlob } from "@/lib/exportacao/baixar-arquivo"
import { linhasDoCsvBaixado } from "@/test/csv-teste"

import { TabelaBairros } from "@/components/territorio/tabela-bairros"

const LINHAS = [
  {
    id: "uv-03",
    uv: 3,
    nome: "São Benedito",
    areaCalculadaM2: 79942.7,
    totalEscolas: 1,
  },
  {
    id: "uv-10",
    uv: 10,
    nome: "Centro",
    areaCalculadaM2: 1266620.9,
    totalEscolas: 8,
  },
  {
    id: "uv-13",
    uv: 13,
    nome: "Rodagem",
    areaCalculadaM2: 922822.4,
    totalEscolas: 0,
  },
]

function renderizar(selecionadoId: string | null = null) {
  const onSelecionar = jest.fn()
  render(
    <TabelaBairros
      bairros={LINHAS}
      selecionadoId={selecionadoId}
      onSelecionar={onSelecionar}
    />
  )
  return onSelecionar
}

function nomesNaOrdem() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((linha) => within(linha).getAllByRole("cell")[1].textContent)
}

describe("TabelaBairros", () => {
  it("mostra UV, bairro, área calculada e escolas de cada bairro", () => {
    renderizar()

    const centro = screen.getByRole("row", { name: /Centro/ })
    expect(
      within(centro)
        .getAllByRole("cell")
        .map((celula) => celula.textContent)
    ).toEqual(["10", "Centro", "1.266.620,9 m²", "8"])
  })

  it("seleciona pelo botão do nome da linha", async () => {
    const usuario = userEvent.setup()
    const onSelecionar = renderizar()

    await usuario.click(screen.getByRole("button", { name: "Centro" }))

    expect(onSelecionar).toHaveBeenCalledTimes(1)
    expect(onSelecionar).toHaveBeenCalledWith("uv-10")
  })

  it("destaca a linha selecionada e marca o botão com aria-current", () => {
    renderizar("uv-10")

    expect(screen.getByRole("row", { name: /Centro/ })).toHaveAttribute(
      "data-state",
      "selected"
    )
    expect(screen.getByRole("button", { name: "Centro" })).toHaveAttribute(
      "aria-current",
      "true"
    )
    expect(screen.getByRole("row", { name: /Rodagem/ })).not.toHaveAttribute(
      "data-state"
    )
  })

  it("ordena por escolas, alterna o sentido e informa em aria-sort", async () => {
    const usuario = userEvent.setup()
    renderizar()
    const cabecalho = screen.getByRole("columnheader", { name: /Escolas/ })

    expect(nomesNaOrdem()).toEqual(["São Benedito", "Centro", "Rodagem"])
    expect(cabecalho).toHaveAttribute("aria-sort", "none")

    // Coluna numérica: o primeiro clique ordena do maior para o menor (padrão do TanStack Table).
    await usuario.click(within(cabecalho).getByRole("button"))
    expect(nomesNaOrdem()).toEqual(["Centro", "São Benedito", "Rodagem"])
    expect(cabecalho).toHaveAttribute("aria-sort", "descending")

    await usuario.click(within(cabecalho).getByRole("button"))
    expect(nomesNaOrdem()).toEqual(["Rodagem", "São Benedito", "Centro"])
    expect(cabecalho).toHaveAttribute("aria-sort", "ascending")
  })

  it("explica o zero de escolas com a ressalva da base e liga a nota à célula", () => {
    renderizar()

    const nota = screen.getByText(
      /Nenhuma escola da base disponível dentro deste bairro/
    )
    const celulaDeRodagem = within(
      screen.getByRole("row", { name: /Rodagem/ })
    ).getAllByRole("cell")[3]

    expect(nota).toHaveTextContent("A base não é um censo completo.")
    expect(celulaDeRodagem).toHaveAttribute("aria-describedby", nota.id)
    expect(
      within(screen.getByRole("row", { name: /Centro/ })).getAllByRole(
        "cell"
      )[3]
    ).not.toHaveAttribute("aria-describedby")
  })

  it("não mostra a ressalva quando todo bairro tem escola", () => {
    render(
      <TabelaBairros
        bairros={LINHAS.slice(0, 2)}
        selecionadoId={null}
        onSelecionar={jest.fn()}
      />
    )

    expect(
      screen.queryByText(/Nenhuma escola da base disponível/)
    ).not.toBeInTheDocument()
  })
})

jest.mock("@/lib/exportacao/baixar-arquivo", () => ({ baixarBlob: jest.fn() }))

describe("TabelaBairros: Exportar CSV (RF-05.18)", () => {
  beforeEach(() => jest.mocked(baixarBlob).mockClear())

  it("exporta os bairros na ordem da tela, com a área em vírgula decimal e o zero de escolas como 0", async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(screen.getByRole("button", { name: /^Bairro/ }))

    await usuario.click(
      screen.getByRole("button", { name: "Exportar CSV: bairros da sede" })
    )

    const [blob, nome] = jest.mocked(baixarBlob).mock.calls[0]
    expect(nome).toMatch(/^acarau-inteligente_bairros_\d{4}-\d{2}-\d{2}\.csv$/)
    expect(await linhasDoCsvBaixado(blob)).toEqual([
      "UV;Bairro;Área calculada (m²);Escolas",
      "10;Centro;1266620,9;8",
      "13;Rodagem;922822,4;0",
      "3;São Benedito;79942,7;1",
    ])
  })
})
