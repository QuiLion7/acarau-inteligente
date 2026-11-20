import { render, screen } from "@testing-library/react"

import { ListaCamadas } from "@/app/fontes/components/lista-camadas"

describe("ListaCamadas", () => {
  it("mostra cada camada recebida com fonte e versão", () => {
    render(
      <ListaCamadas
        camadas={[
          { id: "a", nome: "Camada A", fonte: "Órgão A", versao: "v1" },
          { id: "b", nome: "Camada B", fonte: "Órgão B", versao: "v2" },
        ]}
      />
    )

    const itens = screen.getAllByRole("listitem")
    expect(itens).toHaveLength(2)
    expect(itens[0]).toHaveTextContent("Camada A")
    expect(itens[0]).toHaveTextContent("Fonte:Órgão A")
    expect(itens[1]).toHaveTextContent("Versão:v2")
  })
})
