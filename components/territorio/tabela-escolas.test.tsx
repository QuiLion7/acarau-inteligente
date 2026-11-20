import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { TabelaEscolas } from "@/components/territorio/tabela-escolas"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

const { escolas, bairros } = obterDadosTerritorio()
const FONTE = "Catálogo de escolas do INEP (CSV fornecido)"
const NAO_INFORMADA = "Não informada"

function renderizar(
  bairroId: string | null = null,
  onAbrirEscola: (codigo: string) => void = jest.fn()
) {
  const bairro = bairros.find(({ id }) => id === bairroId) ?? null
  return render(
    <TabelaEscolas
      escolas={escolas}
      bairros={bairros}
      bairroSelecionado={bairro}
      fonte={FONTE}
      dataReferencia={NAO_INFORMADA}
      onAbrirEscola={onAbrirEscola}
    />
  )
}

async function filtrar(rotulo: string, opcao: string) {
  const usuario = userEvent.setup()
  await usuario.click(screen.getByRole("combobox", { name: rotulo }))
  await usuario.click(await screen.findByRole("option", { name: opcao }))
}

const linhasDeDados = () => screen.getAllByRole("row").slice(1)

describe("TabelaEscolas", () => {
  it("em Todos mostra as 62 escolas, 10 por página, com o total e a fonte", () => {
    renderizar()

    expect(linhasDeDados()).toHaveLength(10)
    expect(
      screen.getByRole("heading", { name: "Todas as escolas da base" })
    ).toBeInTheDocument()
    expect(
      screen.getByText("Mostrando 1 a 10 de 62 escolas.")
    ).toBeInTheDocument()
    expect(screen.getByText("Página 1 de 7")).toBeInTheDocument()
    expect(
      screen.getByText(`Fonte: ${FONTE}. Data de referência: ${NAO_INFORMADA}.`)
    ).toBeInTheDocument()
  })

  it("a próxima página mostra as escolas seguintes e a última tem o resto", async () => {
    const usuario = userEvent.setup()
    renderizar()
    const primeiraPagina = linhasDeDados().map((linha) => linha.textContent)

    await usuario.click(screen.getByRole("button", { name: "Próxima página" }))

    expect(
      screen.getByText("Mostrando 11 a 20 de 62 escolas.")
    ).toBeInTheDocument()
    expect(linhasDeDados().map((linha) => linha.textContent)).not.toEqual(
      primeiraPagina
    )
    for (let pagina = 2; pagina <= 6; pagina++) {
      await usuario.click(
        screen.getByRole("button", { name: "Próxima página" })
      )
    }
    expect(
      screen.getByText("Mostrando 61 a 62 de 62 escolas.")
    ).toBeInTheDocument()
    expect(linhasDeDados()).toHaveLength(2)
    expect(
      screen.getByRole("button", { name: "Próxima página" })
    ).toBeDisabled()
  })

  it("com o Centro selecionado lista só as 8 escolas dele e mostra o bairro de cada uma", () => {
    renderizar("uv-10")

    expect(
      screen.getByRole("heading", { name: "Escolas de Centro" })
    ).toBeInTheDocument()
    expect(linhasDeDados()).toHaveLength(8)
    for (const linha of linhasDeDados()) {
      expect(within(linha).getByText("Centro")).toBeInTheDocument()
    }
    expect(
      screen.getByText("Mostrando 1 a 8 de 8 escolas.")
    ).toBeInTheDocument()
  })

  it("filtrar por Privada e Urbana mostra só essas, com o total igual às linhas", async () => {
    renderizar()

    await filtrar("Dependência", "Privada")
    await filtrar("Localização", "Urbana")

    expect(linhasDeDados()).toHaveLength(9)
    for (const linha of linhasDeDados()) {
      expect(within(linha).getByText("Privada")).toBeInTheDocument()
      expect(within(linha).getByText("Urbana")).toBeInTheDocument()
    }
    expect(
      screen.getByText("Mostrando 1 a 9 de 9 escolas.")
    ).toBeInTheDocument()
  })

  it("filtrar por cobertura 'Sem localização' lista as 4 escolas sem posição", async () => {
    renderizar()

    await filtrar("Cobertura", "Sem localização")

    expect(linhasDeDados()).toHaveLength(4)
    expect(
      screen.getByText("Mostrando 1 a 4 de 4 escolas.")
    ).toBeInTheDocument()
  })

  it("filtro que não casa com nada diz que nenhuma escola corresponde, sem a ressalva de bairro", async () => {
    renderizar("uv-10")

    await filtrar("Localização", "Rural")

    expect(
      screen.getByText(
        "Nenhuma escola da base corresponde aos filtros escolhidos."
      )
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/Nenhuma escola da base disponível/)
    ).not.toBeInTheDocument()
  })

  it("bairro sem escola (Outra Banda) mostra a ressalva de que a base não é completa", () => {
    renderizar("uv-01")

    expect(linhasDeDados()).toHaveLength(0)
    expect(
      screen.getByText(
        "Nenhuma escola da base disponível dentro deste bairro. A base não é um censo completo."
      )
    ).toBeInTheDocument()
  })

  it("abrir uma escola pelo nome avisa o código INEP dela", async () => {
    const usuario = userEvent.setup()
    const onAbrirEscola = jest.fn()
    renderizar("uv-10", onAbrirEscola)

    await usuario.click(
      screen.getByRole("button", { name: "VIRGEM PODEROSA ESC" })
    )

    expect(onAbrirEscola).toHaveBeenCalledWith("23000872")
  })
})
