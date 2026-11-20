import { render, screen, within } from "@testing-library/react"

import { FichaEscola } from "@/components/territorio/ficha-escola"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

const { escolas } = obterDadosTerritorio()
const escola = (codigoInep: string) => {
  const encontrada = escolas.find(
    (candidata) => candidata.codigoInep === codigoInep
  )
  if (!encontrada) throw new Error(`Escola ${codigoInep} fora do artefato`)
  return encontrada
}

function valorDe(rotulo: string) {
  return screen.getByText(rotulo, { selector: "dt" }).nextElementSibling
}

describe("FichaEscola", () => {
  it("mostra todos os campos do contrato de uma escola dentro de bairro", () => {
    render(<FichaEscola escola={escola("23000872")} bairroNome="Centro" />)

    const ficha = screen.getByRole("article")
    expect(
      within(ficha).getByRole("heading", { name: "VIRGEM PODEROSA ESC" })
    ).toBeInTheDocument()
    expect(valorDe("Código INEP")).toHaveTextContent("23000872")
    expect(valorDe("Dependência administrativa")).toHaveTextContent("Privada")
    expect(valorDe("Localização")).toHaveTextContent("Urbana")
    expect(valorDe("Endereço")).toHaveTextContent(
      "TRAVESSA IRMAS CORDIMARIANAS, 55"
    )
    expect(valorDe("Situação de atendimento")).toHaveTextContent(
      "ESCOLA EM FUNCIONAMENTO E SEM RESTRIÇÃO DE ATENDIMENTO"
    )
    expect(valorDe("Bairro")).toHaveTextContent("Centro")
    expect(valorDe("Situação de cobertura")).toHaveTextContent(
      "Dentro de bairro"
    )
    expect(valorDe("Fonte")).toHaveTextContent(
      "Catálogo de escolas do INEP (CSV fornecido)"
    )
    expect(valorDe("Data de referência")).toHaveTextContent("Não informada")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("a escola fora do limite vem com o aviso de possível erro na fonte, sem bairro", () => {
    render(<FichaEscola escola={escola("23000910")} bairroNome={null} />)

    expect(valorDe("Bairro")).toHaveTextContent("Nenhum")
    expect(valorDe("Situação de cobertura")).toHaveTextContent(
      "Fora do limite municipal"
    )
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Coordenada fora do limite municipal - possível inconsistência na fonte."
    )
  })

  it("a escola sem localização avisa que não aparece no mapa", () => {
    render(<FichaEscola escola={escola("23278650")} bairroNome={null} />)

    expect(valorDe("Situação de cobertura")).toHaveTextContent(
      "Sem localização"
    )
    expect(screen.getByRole("alert")).toHaveTextContent("não aparece no mapa")
  })

  it("trata o nome como texto, não como HTML", () => {
    const hostil = { ...escola("23000872"), nome: "<b>negrito</b>" }

    render(<FichaEscola escola={hostil} bairroNome="Centro" />)

    expect(
      screen.getByRole("heading", { name: "<b>negrito</b>" })
    ).toBeInTheDocument()
    expect(screen.getByRole("article").querySelector("b")).toBeNull()
  })
})
