import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { FichaObra } from "@/components/obras/ficha-obra"
import { montarObra } from "@/lib/obras/__fixtures__/obra"

const BAIRROS = [{ id: "uv-10", nome: "Centro" }]

const OBRA_COM_HISTORICO = montarObra({
  titulo: "DEMO - Requalificação de praça",
  situacao: "em_andamento",
  descricao: "Texto da descrição",
  categoria: "praca_lazer",
  secretaria: "Infraestrutura",
  dataInicio: "2026-12-01",
  dataPrevista: "2027-03-31",
  valorPrevistoCentavos: 25_000_000,
  localizacao: { longitude: -40.118958, latitude: -2.885116 },
  estadoLocalizacao: "dentro-de-bairro",
  bairroId: "uv-10",
  atualizadoEm: "2026-11-22T12:00:00.000Z",
  historico: [
    {
      situacaoAnterior: "planejada",
      situacaoNova: "em_andamento",
      autorNome: "Analista Demo",
      registradoEm: "2026-11-22T12:00:00.000Z",
    },
    {
      situacaoAnterior: null,
      situacaoNova: "planejada",
      autorNome: "Equipe da demonstração",
      registradoEm: "2026-11-10T13:00:00.000Z",
    },
  ],
})

function ver(obra = OBRA_COM_HISTORICO) {
  return render(<FichaObra obra={obra} bairros={BAIRROS} />)
}

function valorDe(rotulo: string) {
  const termo = screen.getByText(rotulo, { selector: "dt" })
  return termo.nextElementSibling as HTMLElement
}

describe("FichaObra (RF-04.10, TU-13, CA-04.17)", () => {
  it("mostra todos os campos, o bairro pelo nome, as coordenadas e a etiqueta SINTETICO", () => {
    ver()

    expect(
      screen.getByRole("heading", { name: "DEMO - Requalificação de praça" })
    ).toBeVisible()
    expect(valorDe("Situação")).toHaveTextContent("Em andamento")
    expect(valorDe("Categoria")).toHaveTextContent("Praça e lazer")
    expect(valorDe("Secretaria")).toHaveTextContent("Infraestrutura")
    expect(valorDe("Bairro")).toHaveTextContent("Centro")
    expect(valorDe("Coordenadas")).toHaveTextContent(
      "Latitude -2,885116, longitude -40,118958"
    )
    expect(valorDe("Data de início")).toHaveTextContent("01/12/2026")
    expect(valorDe("Data prevista")).toHaveTextContent("31/03/2027")
    expect(valorDe("Descrição")).toHaveTextContent("Texto da descrição")
    expect(valorDe("Última atualização")).toHaveTextContent("22/11/2026 09:00")
    expect(valorDe("Origem")).toHaveTextContent("SINTETICO")
  })

  it("mostra o valor previsto com o aviso de que não é valor pago", () => {
    ver()

    expect(valorDe("Valor previsto").textContent?.replace(/\s/g, " ")).toBe(
      "R$ 250.000,00"
    )
    expect(screen.getByText("Valor previsto - não é valor pago")).toBeVisible()
  })

  it("sem valor previsto não mostra o campo nem o aviso", () => {
    ver(montarObra({ valorPrevistoCentavos: null }))

    expect(screen.queryByText("Valor previsto", { selector: "dt" })).toBeNull()
    expect(screen.queryByText(/não é valor pago/)).toBeNull()
  })

  it("valor previsto zero é mostrado como R$ 0,00 com o aviso, não escondido", () => {
    ver(montarObra({ valorPrevistoCentavos: 0 }))

    expect(valorDe("Valor previsto").textContent?.replace(/\s/g, " ")).toBe(
      "R$ 0,00"
    )
    expect(screen.getByText(/não é valor pago/)).toBeVisible()
  })

  it("campos vazios aparecem como não informado, e a obra sem ponto não tem coordenadas inventadas", () => {
    ver(montarObra())

    for (const rotulo of [
      "Categoria",
      "Secretaria",
      "Coordenadas",
      "Descrição",
    ]) {
      expect(valorDe(rotulo)).toHaveTextContent("Não informado")
    }
    expect(valorDe("Bairro")).toHaveTextContent("Sem localização")
  })

  it("mostra o histórico em texto, do mais recente ao mais antigo, com autor e data", () => {
    ver()

    const itens = within(
      screen.getByRole("region", { name: "Histórico de situação" })
    ).getAllByRole("listitem")
    expect(itens.map((item) => item.textContent)).toEqual([
      "Situação alterada de Planejada para Em andamentoAnalista Demo, em 22/11/2026 09:00",
      "Obra criada como PlanejadaEquipe da demonstração, em 10/11/2026 10:00",
    ])
  })

  it("não tem ação de excluir nem de editar o histórico (CA-04.20)", () => {
    ver()

    expect(screen.queryAllByRole("button")).toEqual([])
    expect(screen.queryByText(/excluir|apagar|remover/i)).toBeNull()
  })

  it("mostra título e descrição com HTML como texto literal (TU-14)", () => {
    ver(montarObra({ titulo: "<b>x</b>", descricao: "<i>y</i>" }))

    expect(screen.getByRole("heading", { name: "<b>x</b>" })).toBeVisible()
    expect(screen.getByText("<i>y</i>")).toBeVisible()
    expect(document.querySelector("article b, article i")).toBeNull()
  })

  it("só mostra Editar obra quando quem pode editar entrega a ação, e o clique a chama", async () => {
    const onEditar = jest.fn()
    const { unmount } = render(
      <FichaObra
        obra={OBRA_COM_HISTORICO}
        bairros={BAIRROS}
        onEditar={onEditar}
      />
    )

    await userEvent.click(screen.getByRole("button", { name: "Editar obra" }))

    expect(onEditar).toHaveBeenCalledTimes(1)
    unmount()
    ver()
    expect(screen.queryByRole("button", { name: "Editar obra" })).toBeNull()
  })
})
