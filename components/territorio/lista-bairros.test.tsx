import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ListaBairros } from "@/components/territorio/lista-bairros"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"

const BAIRROS: BairroResumo[] = [
  { id: "uv-03", uv: 3, nome: "São Benedito", nomeLei: "SÃO BENEDITO" },
  { id: "uv-10", uv: 10, nome: "Centro", nomeLei: "CENTRO" },
  { id: "uv-13", uv: 13, nome: "Rodagem", nomeLei: "RODAGEM" },
]

function renderizar(selecionadoId: string | null = null) {
  const onSelecionar = jest.fn()
  render(
    <ListaBairros
      bairros={BAIRROS}
      selecionadoId={selecionadoId}
      onSelecionar={onSelecionar}
    />
  )
  return onSelecionar
}

describe("ListaBairros", () => {
  it("lista todos os bairros como botões e diz quantos foram encontrados", () => {
    renderizar()

    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "UV 3São Benedito",
      "UV 10Centro",
      "UV 13Rodagem",
    ])
    expect(screen.getByRole("status")).toHaveTextContent(
      "3 bairros encontrados"
    )
  })

  it("busca, escolhe e seleciona só com o teclado", async () => {
    const usuario = userEvent.setup()
    const onSelecionar = renderizar()

    await usuario.tab()
    expect(
      screen.getByRole("searchbox", { name: "Buscar bairro" })
    ).toHaveFocus()
    await usuario.keyboard("sao  benedito")
    await usuario.tab()
    await usuario.keyboard("{Enter}")

    expect(screen.getAllByRole("button")).toHaveLength(1)
    expect(screen.getByRole("status")).toHaveTextContent("1 bairro encontrado")
    expect(onSelecionar).toHaveBeenCalledTimes(1)
    expect(onSelecionar).toHaveBeenCalledWith("uv-03")
  })

  it("acha pelo código da UV", async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.type(screen.getByRole("searchbox"), "13")

    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "UV 13Rodagem",
    ])
  })

  it("mostra a cobertura da demonstração, sem sugestão, quando a busca não acha bairro", async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.type(screen.getByRole("searchbox"), "Aranaú")

    expect(screen.queryAllByRole("button")).toHaveLength(0)
    expect(
      screen.getByRole("heading", { name: "Nenhum bairro encontrado" })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Localidades da zona rural não estão nessa cobertura/)
    ).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(
      "0 bairros encontrados"
    )
  })

  it("marca com aria-current só o bairro selecionado", () => {
    renderizar("uv-10")

    expect(screen.getByRole("button", { name: /Centro/ })).toHaveAttribute(
      "aria-current",
      "true"
    )
    expect(screen.getByRole("button", { name: /Rodagem/ })).not.toHaveAttribute(
      "aria-current"
    )
  })
})
