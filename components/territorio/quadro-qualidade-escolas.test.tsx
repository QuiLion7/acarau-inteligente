import { render, screen, within } from "@testing-library/react"

import { QuadroQualidadeEscolas } from "@/components/territorio/quadro-qualidade-escolas"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"
import type { QualidadeEscolas } from "@/lib/territorio/artefato-schema"

const { qualidade } = obterDadosTerritorio()
const FONTE = "Catálogo de escolas do INEP (CSV fornecido)"

function renderizar(dados: QualidadeEscolas) {
  return render(
    <QuadroQualidadeEscolas
      qualidade={dados}
      fonte={FONTE}
      dataReferencia="Não informada"
    />
  )
}

function indicador(rotulo: string) {
  return screen.getByText(rotulo, { selector: "dt" }).nextElementSibling
}

describe("QuadroQualidadeEscolas", () => {
  it("mostra 62 / 58 / 4 / 33 / 1 lidos do artefato, com a frase de total e a fonte", () => {
    renderizar(qualidade)

    expect(indicador("Registros no catálogo")).toHaveTextContent("62")
    expect(indicador("Com localização")).toHaveTextContent("58")
    expect(indicador("Sem localização")).toHaveTextContent("4")
    expect(indicador("Fora da cobertura dos bairros")).toHaveTextContent("33")
    expect(indicador("Fora do limite municipal")).toHaveTextContent("1")
    expect(
      screen.getByText(
        "58 estabelecimentos escolares georreferenciados na base disponível."
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(`Fonte: ${FONTE}. Data de referência: Não informada.`)
    ).toBeInTheDocument()
  })

  it("lista as 4 sem localização por nome e INEP, e identifica a fora do limite com aviso", () => {
    renderizar(qualidade)

    const semLocalizacao = screen.getByRole("heading", {
      name: /Sem localização/,
    }).nextElementSibling as HTMLElement
    expect(within(semLocalizacao).getAllByRole("listitem")).toHaveLength(4)
    expect(semLocalizacao).toHaveTextContent("COLEGIO ETHOS (INEP 23278650)")
    const foraDoLimite = screen.getByRole("heading", {
      name: "Fora do limite municipal",
    }).nextElementSibling as HTMLElement
    expect(foraDoLimite).toHaveTextContent(
      "ANTONIO FERREIRA SALES EEIEF (INEP 23000910)"
    )
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Coordenada fora do limite municipal - possível inconsistência na fonte."
    )
  })

  it("os números mudam com as props: nada está fixo na tela", () => {
    renderizar({
      ...qualidade,
      totalCatalogo: 100,
      comLocalizacao: 90,
      semLocalizacao: 10,
      foraDaCobertura: 7,
      foraDoLimite: 0,
      semLocalizacaoLista: [],
      foraDoLimiteLista: [],
    })

    expect(indicador("Registros no catálogo")).toHaveTextContent("100")
    expect(indicador("Com localização")).toHaveTextContent("90")
    expect(indicador("Fora do limite municipal")).toHaveTextContent("0")
    expect(
      screen.getByText(
        "90 estabelecimentos escolares georreferenciados na base disponível."
      )
    ).toBeInTheDocument()
  })

  it("sem escola em uma lista não mostra o título dela nem o aviso", () => {
    renderizar({ ...qualidade, semLocalizacaoLista: [], foraDoLimiteLista: [] })

    expect(
      screen.queryByRole("heading", { name: /Sem localização \(/ })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})
