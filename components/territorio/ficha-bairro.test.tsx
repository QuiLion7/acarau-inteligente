import { render, screen, within } from "@testing-library/react"

import { FichaBairro } from "@/components/territorio/ficha-bairro"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

const { bairros } = obterDadosTerritorio()
const bairro = (id: string) => {
  const encontrado = bairros.find((item) => item.id === id)
  if (!encontrado) throw new Error(`bairro ${id} ausente do artefato`)
  return encontrado
}

function valorDe(rotulo: string) {
  return within(screen.getByRole("article")).getByText(rotulo)
    .nextElementSibling
}

describe("FichaBairro", () => {
  it("mostra a ficha de Rodagem: nome, nome da lei, UV, fonte com página, aviso e área não informada na lei", () => {
    render(<FichaBairro bairro={bairro("uv-13")} />)

    expect(screen.getByRole("heading", { name: "Rodagem" })).toBeInTheDocument()
    expect(valorDe("Nome na lei")).toHaveTextContent("RODAGEM")
    expect(valorDe("Código da UV")).toHaveTextContent("13")
    expect(valorDe("Fonte")).toHaveTextContent(
      "Lei Municipal 2.172/2026, art. 8º, I, p. 49"
    )
    expect(valorDe("Etiqueta")).toHaveTextContent("DERIVADO_VALIDAR")
    expect(valorDe("Área calculada")).toHaveTextContent("922.822,4 m²")
    expect(valorDe("Área declarada na lei")).toHaveTextContent(
      "Não informada na lei"
    )
    expect(
      screen.getByText(/não é arquivo oficial homologado da Prefeitura/)
    ).toBeInTheDocument()
    expect(screen.getByRole("article")).not.toHaveTextContent(/\b0\b/)
  })

  it("mostra a área da lei quando ela existe e o número de escolas do Centro", () => {
    render(<FichaBairro bairro={bairro("uv-10")} />)

    expect(valorDe("Área declarada na lei")).not.toHaveTextContent(
      "Não informada"
    )
    expect(valorDe("Área declarada na lei")).toHaveTextContent("m²")
    expect(valorDe("Escolas na base disponível")).toHaveTextContent("8 escolas")
    expect(
      screen.queryByText(/Nenhuma escola da base disponível/)
    ).not.toBeInTheDocument()
  })

  it("mostra a ressalva da base no bairro sem escola, em vez de um zero solto", () => {
    const semEscola = bairros.find((item) => item.totalEscolas === 0)
    if (!semEscola) throw new Error("a base atual tem bairro sem escola")

    render(<FichaBairro bairro={semEscola} />)

    expect(valorDe("Escolas na base disponível")).toHaveTextContent("Nenhuma")
    expect(
      screen.getByText(
        "Nenhuma escola da base disponível dentro deste bairro. A base não é um censo completo."
      )
    ).toBeInTheDocument()
  })

  it("escreve 1 escola no singular", () => {
    render(<FichaBairro bairro={{ ...bairro("uv-13"), totalEscolas: 1 }} />)

    expect(valorDe("Escolas na base disponível")).toHaveTextContent("1 escola")
    expect(valorDe("Escolas na base disponível")).not.toHaveTextContent(
      "escolas"
    )
  })

  it("trata o nome como texto, nunca como HTML", () => {
    render(
      <FichaBairro bairro={{ ...bairro("uv-13"), nome: "<b>Negrito</b>" }} />
    )

    expect(
      screen.getByRole("heading", { name: "<b>Negrito</b>" })
    ).toBeInTheDocument()
    expect(document.querySelector("article b")).toBeNull()
  })
})
