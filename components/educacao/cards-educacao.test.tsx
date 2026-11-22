import { render, screen, within } from "@testing-library/react"

import { CardsEducacao } from "@/components/educacao/cards-educacao"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

const { qualidade, bairros } = obterDadosTerritorio()
const FONTE = "Catálogo de escolas do INEP (CSV fornecido)"
const NAO_INFORMADA = "Não informada"

function renderizar(bairroId: string | null = null) {
  const bairro = bairros.find(({ id }) => id === bairroId) ?? null
  render(
    <CardsEducacao
      qualidade={qualidade}
      bairroSelecionado={bairro}
      fonte={FONTE}
      dataReferencia={NAO_INFORMADA}
    />
  )
}

const card = (nome: string) => within(screen.getByRole("group", { name: nome }))

describe("CardsEducacao (TU-21, CA-03.16)", () => {
  it.each([
    ["Registros na base", "62"],
    ["Estabelecimentos escolares georreferenciados na base disponível", "58"],
    ["Sem localização", "4"],
    ["Dentro dos bairros da sede", "24"],
    ["Fora da cobertura dos bairros", "33"],
  ])("o card '%s' mostra %s", (titulo, valor) => {
    renderizar()

    expect(card(titulo).getByText(valor, { exact: true })).toBeVisible()
  })

  it("o card de fora da cobertura cita à parte a escola fora do limite, sem somá-la", () => {
    renderizar()

    expect(
      card("Fora da cobertura dos bairros").getByText(
        "A escola fora do limite municipal é citada à parte."
      )
    ).toBeVisible()
  })

  it("todo card diz a fonte e a data de referência 'Não informada'", () => {
    renderizar()

    const cards = screen.getAllByRole("group")
    expect(cards).toHaveLength(5)
    for (const cartao of cards) {
      expect(cartao).toHaveTextContent(
        `Fonte: ${FONTE}. Data de referência: ${NAO_INFORMADA}.`
      )
    }
  })

  it("não afirma completude nem funcionamento atual (RN-03.08)", () => {
    renderizar()

    expect(
      screen.getByRole("region", { name: "Resumo das escolas da base" })
    ).not.toHaveTextContent(/censo|completo|em funcionamento|todas as escolas/i)
  })

  it("com bairro selecionado ganha o card do bairro com o total dele, e os cinco seguem os mesmos", () => {
    renderizar("uv-10")

    expect(card("Escolas em Centro").getByText("8 escolas")).toBeVisible()
    expect(card("Registros na base").getByText("62")).toBeVisible()
    expect(screen.getAllByRole("group")).toHaveLength(6)
  })

  it("bairro sem escola mostra '0 na base disponível', não 'sem escola'", () => {
    const semEscola = bairros.find(({ totalEscolas }) => totalEscolas === 0)
    expect(semEscola).toBeDefined()

    renderizar(semEscola!.id)

    expect(
      card(`Escolas em ${semEscola!.nome}`).getByText("0 na base disponível")
    ).toBeVisible()
  })

  it("um bairro com uma escola só concorda em número", () => {
    const comUma = bairros.find(({ totalEscolas }) => totalEscolas === 1)
    expect(comUma).toBeDefined()

    renderizar(comUma!.id)

    expect(
      card(`Escolas em ${comUma!.nome}`).getByText("1 escola")
    ).toBeVisible()
  })
})
