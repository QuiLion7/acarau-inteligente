import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { baixarBlob } from "@/lib/exportacao/baixar-arquivo"
import { linhasDoCsvBaixado } from "@/test/csv-teste"

import { TabelaEscolas } from "@/components/territorio/tabela-escolas"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

const { escolas, bairros } = obterDadosTerritorio()
const FONTE = "Catálogo de escolas do INEP (CSV fornecido)"
const NAO_INFORMADA = "Não informada"

function renderizar(
  bairroId: string | null = null,
  onAbrirEscola: (codigo: string) => void = jest.fn(),
  comBusca = false
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
      comBusca={comBusca}
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

describe("TabelaEscolas com busca (TU-24, CA-03.21, CA-03.22, PA-03.05)", () => {
  const busca = () => screen.getByRole("searchbox", { name: "Buscar escola" })

  it("sem a prop, a tela é a do Território: sem campo de busca nem 'Limpar filtros', mesmo com filtro ligado", async () => {
    renderizar()

    await filtrar("Localização", "Rural")

    expect(screen.queryByRole("searchbox")).toBeNull()
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).toBeNull()
  })

  it("buscar o código INEP 23000910 lista só a escola fora do limite, com a contagem", async () => {
    const usuario = userEvent.setup()
    renderizar(null, jest.fn(), true)

    await usuario.type(busca(), "23000910")

    expect(linhasDeDados()).toHaveLength(1)
    expect(
      within(linhasDeDados()[0]!).getByText("Fora do limite municipal")
    ).toBeVisible()
    expect(screen.getByText("Mostrando 1 a 1 de 1 escola.")).toBeVisible()
  })

  it("a busca combina com os filtros e a contagem acompanha as linhas", async () => {
    const usuario = userEvent.setup()
    renderizar(null, jest.fn(), true)

    await filtrar("Dependência", "Estadual")
    await filtrar("Localização", "Rural")

    const total = linhasDeDados().length
    expect(total).toBeGreaterThan(0)
    expect(
      screen.getByText(
        `Mostrando 1 a ${total} de ${total} ${total === 1 ? "escola" : "escolas"}.`
      )
    ).toBeVisible()
    await usuario.type(busca(), "zzzz")
    expect(linhasDeDados()).toHaveLength(0)
  })

  it("'Limpar filtros' só aparece com algo ligado e devolve as 62 escolas, esvaziando a busca e os filtros", async () => {
    const usuario = userEvent.setup()
    renderizar(null, jest.fn(), true)
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).toBeNull()

    await usuario.type(busca(), "escola")
    await filtrar("Localização", "Rural")
    await usuario.click(screen.getByRole("button", { name: "Limpar filtros" }))

    expect(busca()).toHaveValue("")
    expect(
      screen.getByRole("combobox", { name: "Localização" })
    ).toHaveTextContent("Todas")
    expect(screen.getByText("Mostrando 1 a 10 de 62 escolas.")).toBeVisible()
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).toBeNull()
  })

  it("sem resultado mostra o estado vazio com a ação 'Limpar filtros', que restaura a lista", async () => {
    const usuario = userEvent.setup()
    renderizar(null, jest.fn(), true)

    await usuario.type(busca(), "zzzzzz")

    expect(
      screen.getByRole("heading", { name: "Nenhuma escola encontrada" })
    ).toBeVisible()
    expect(
      screen.getByText(
        "Nenhuma escola da base corresponde à busca e aos filtros escolhidos."
      )
    ).toBeVisible()
    expect(
      screen.getAllByRole("button", { name: "Limpar filtros" })
    ).toHaveLength(1)

    await usuario.click(screen.getByRole("button", { name: "Limpar filtros" }))

    expect(screen.getByText("Mostrando 1 a 10 de 62 escolas.")).toBeVisible()
    expect(
      screen.queryByRole("heading", { name: "Nenhuma escola encontrada" })
    ).toBeNull()
  })

  it("bairro sem escola, sem filtro ligado, mostra a ressalva da base e nenhuma ação de limpar", () => {
    renderizar("uv-01", jest.fn(), true)

    expect(
      screen.getByText(
        "Nenhuma escola da base disponível dentro deste bairro. A base não é um censo completo."
      )
    ).toBeVisible()
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).toBeNull()
  })

  it("a busca respeita o bairro selecionado: o código de uma escola de outro bairro não aparece", async () => {
    const usuario = userEvent.setup()
    renderizar("uv-10", jest.fn(), true)

    await usuario.type(busca(), "23000910")

    expect(linhasDeDados()).toHaveLength(0)
    expect(
      screen.getByRole("heading", { name: "Nenhuma escola encontrada" })
    ).toBeVisible()
  })
})

jest.mock("@/lib/exportacao/baixar-arquivo", () => ({ baixarBlob: jest.fn() }))

describe("TabelaEscolas: Exportar CSV (RF-05.18, CA-05.12)", () => {
  beforeEach(() => jest.mocked(baixarBlob).mockClear())

  it("exporta as 62 escolas de todas as páginas, não só as 10 da página atual", async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(
      screen.getByRole("button", { name: "Exportar CSV: lista de escolas" })
    )

    const linhas = await linhasDoCsvBaixado(
      jest.mocked(baixarBlob).mock.calls[0][0]
    )
    expect(linhas).toHaveLength(1 + 62)
    expect(linhas[0]).toBe(
      "Escola;Código INEP;Dependência;Localização;Bairro;Cobertura"
    )
    expect(
      linhas.slice(1).every((linha) => linha.split(";").every((c) => c !== ""))
    ).toBe(true)
  })

  it("exporta só as linhas do filtro atual e leva o bairro escolhido no nome do arquivo", async () => {
    const usuario = userEvent.setup()
    renderizar("uv-10")
    await filtrar("Dependência", "Municipal")

    await usuario.click(
      screen.getByRole("button", { name: "Exportar CSV: lista de escolas" })
    )

    const [blob, nome] = jest.mocked(baixarBlob).mock.calls[0]
    expect(nome).toMatch(/_centro\.csv$/)
    const linhas = (await linhasDoCsvBaixado(blob)).slice(1)
    expect(linhas.length).toBeGreaterThan(0)
    expect(
      linhas.every(
        (linha) => linha.includes(";Municipal;") && linha.includes(";Centro;")
      )
    ).toBe(true)
  })
})
