import { render, screen } from "@testing-library/react"

import { EstadoInterface } from "@/components/estados/estado-interface"
import {
  ESTADOS_INTERFACE,
  type TipoEstado,
} from "@/lib/config/estados-interface"

const TIPOS = Object.keys(ESTADOS_INTERFACE) as TipoEstado[]

describe("EstadoInterface", () => {
  it("cobre os nove estados do RF-00.15 e o disponível em breve", () => {
    expect(TIPOS).toEqual([
      "carregando",
      "vazio",
      "erro",
      "sem-permissao",
      "dados-sinteticos",
      "fonte-ausente",
      "periodo-sem-dados",
      "fora-da-cobertura",
      "bairro-nao-reconhecido",
      "em-breve",
    ])
  })

  it.each(TIPOS)(
    "mostra o título e o texto pt-BR do catálogo para %s, sem o texto 0",
    (tipo) => {
      const { container } = render(<EstadoInterface tipo={tipo} />)

      expect(screen.getByRole("heading")).toHaveTextContent(
        ESTADOS_INTERFACE[tipo].titulo
      )
      expect(screen.getByText(ESTADOS_INTERFACE[tipo].descricao)).toBeVisible()
      expect(container).not.toHaveTextContent("0")
    }
  )

  it("anuncia o erro como alerta e o carregamento como status", () => {
    const { rerender } = render(<EstadoInterface tipo="erro" />)
    expect(screen.getByRole("alert")).toHaveTextContent(
      ESTADOS_INTERFACE.erro.titulo
    )

    rerender(<EstadoInterface tipo="carregando" />)
    expect(screen.getByRole("status", { name: "Carregando" })).toBeVisible()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("usa título, texto e ação do chamador no lugar dos padrões", () => {
    render(
      <EstadoInterface
        tipo="vazio"
        titulo="Nenhuma camada carregada"
        descricao="As camadas aparecem aqui quando forem carregadas."
        acao={<a href="/ajuda">Voltar ao início</a>}
      />
    )

    expect(
      screen.getByRole("heading", { name: "Nenhuma camada carregada" })
    ).toBeVisible()
    expect(
      screen.getByText("As camadas aparecem aqui quando forem carregadas.")
    ).toBeVisible()
    expect(
      screen.getByRole("link", { name: "Voltar ao início" })
    ).toHaveAttribute("href", "/ajuda")
    expect(screen.queryByText(ESTADOS_INTERFACE.vazio.titulo)).toBeNull()
  })

  it("não renderiza botão nem controle quando não há ação", () => {
    render(<EstadoInterface tipo="em-breve" />)

    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()
  })

  it("usa h1 quando o estado é o título da página", () => {
    render(<EstadoInterface tipo="erro" nivelTitulo={1} />)

    expect(screen.getByRole("heading", { level: 1 })).toBeVisible()
  })
})
