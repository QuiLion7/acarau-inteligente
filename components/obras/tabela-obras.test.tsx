import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { baixarBlob } from "@/lib/exportacao/baixar-arquivo"
import { linhasDoCsvBaixado } from "@/test/csv-teste"

import { TabelaObras } from "@/components/obras/tabela-obras"
import { montarObra } from "@/lib/obras/__fixtures__/obra"

const BAIRROS = [
  { id: "uv-10", nome: "Centro" },
  { id: "uv-03", nome: "São Benedito" },
]

const OBRAS = [
  montarObra({
    id: "obra-1",
    titulo: "DEMO - Praça",
    situacao: "em_andamento",
    categoria: "praca_lazer",
    dataPrevista: "2027-03-31",
    estadoLocalizacao: "dentro-de-bairro",
    bairroId: "uv-10",
    atualizadoEm: "2026-11-21T14:05:00.000Z",
  }),
  montarObra({
    id: "obra-2",
    titulo: "DEMO - Adutora",
    situacao: "suspensa",
    estadoLocalizacao: "fora-da-cobertura",
  }),
  montarObra({ id: "obra-3", titulo: "DEMO - Área de lazer" }),
]

beforeEach(() => {
  // O jsdom não implementa `scrollIntoView`.
  Element.prototype.scrollIntoView = jest.fn()
})

function linhaDe(titulo: string) {
  return screen.getByRole("row", { name: new RegExp(titulo) })
}

describe("TabelaObras (RF-04.04, CA-04.01)", () => {
  it("mostra título, situação, categoria, bairro, data prevista, última atualização e a etiqueta SINTETICO", () => {
    render(
      <TabelaObras
        obras={OBRAS}
        bairros={BAIRROS}
        obraSelecionadaId={null}
        onAbrirObra={jest.fn()}
      />
    )

    const linha = within(linhaDe("DEMO - Praça"))
    expect(linha.getByText("Em andamento")).toBeVisible()
    expect(linha.getByText("Praça e lazer")).toBeVisible()
    expect(linha.getByText("Centro")).toBeVisible()
    expect(linha.getByText("31/03/2027")).toBeVisible()
    expect(linha.getByText("21/11/2026 11:05")).toBeVisible()
    expect(linha.getByText("SINTETICO")).toBeVisible()
  })

  it("escreve fora da cobertura e sem localização no lugar do bairro, e traço no que não tem valor", () => {
    render(
      <TabelaObras
        obras={OBRAS}
        bairros={BAIRROS}
        obraSelecionadaId={null}
        onAbrirObra={jest.fn()}
      />
    )

    expect(
      within(linhaDe("DEMO - Adutora")).getByText(
        "Fora da cobertura dos bairros"
      )
    ).toBeVisible()
    const semLocalizacao = within(linhaDe("DEMO - Área de lazer"))
    expect(semLocalizacao.getByText("Sem localização")).toBeVisible()
    expect(semLocalizacao.getAllByText("-")).toHaveLength(2)
  })

  it("diz quantas obras mostra, com o substantivo concordando com o total", () => {
    const { rerender } = render(
      <TabelaObras
        obras={OBRAS}
        bairros={BAIRROS}
        obraSelecionadaId={null}
        onAbrirObra={jest.fn()}
      />
    )
    expect(screen.getByRole("status")).toHaveTextContent("Mostrando 3 obras.")

    rerender(
      <TabelaObras
        obras={OBRAS.slice(0, 1)}
        bairros={BAIRROS}
        obraSelecionadaId={null}
        onAbrirObra={jest.fn()}
      />
    )
    expect(screen.getByRole("status")).toHaveTextContent("Mostrando 1 obra.")
  })

  it("clicar no título abre a obra pelo id", async () => {
    const usuario = userEvent.setup()
    const onAbrirObra = jest.fn()
    render(
      <TabelaObras
        obras={OBRAS}
        bairros={BAIRROS}
        obraSelecionadaId={null}
        onAbrirObra={onAbrirObra}
      />
    )

    await usuario.click(screen.getByRole("button", { name: "DEMO - Adutora" }))

    expect(onAbrirObra).toHaveBeenCalledWith("obra-2")
  })

  it("só a linha da obra selecionada leva aria-current e é rolada para a vista (CA-04.27)", () => {
    const { rerender } = render(
      <TabelaObras
        obras={OBRAS}
        bairros={BAIRROS}
        obraSelecionadaId={null}
        onAbrirObra={jest.fn()}
      />
    )
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()

    rerender(
      <TabelaObras
        obras={OBRAS}
        bairros={BAIRROS}
        obraSelecionadaId="obra-2"
        onAbrirObra={jest.fn()}
      />
    )

    expect(linhaDe("DEMO - Adutora")).toHaveAttribute("aria-current", "true")
    expect(linhaDe("DEMO - Praça")).not.toHaveAttribute("aria-current")
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1)
  })

  it("mostra o título com HTML como texto literal, sem criar elemento (TU-14)", () => {
    render(
      <TabelaObras
        obras={[montarObra({ titulo: "<b>x</b>" })]}
        bairros={BAIRROS}
        obraSelecionadaId={null}
        onAbrirObra={jest.fn()}
      />
    )

    expect(screen.getByRole("button", { name: "<b>x</b>" })).toBeVisible()
    expect(document.querySelector("table b")).toBeNull()
  })

  it("a área da lista é focável para rolar com o teclado e tem nome", () => {
    render(
      <TabelaObras
        obras={OBRAS}
        bairros={BAIRROS}
        obraSelecionadaId={null}
        onAbrirObra={jest.fn()}
      />
    )

    expect(
      screen.getByRole("region", { name: "Lista de obras" })
    ).toHaveAttribute("tabindex", "0")
  })
})

jest.mock("@/lib/exportacao/baixar-arquivo", () => ({ baixarBlob: jest.fn() }))

describe("TabelaObras: Exportar CSV (RF-05.18, CA-05.11, CA-05.12)", () => {
  beforeEach(() => jest.mocked(baixarBlob).mockClear())

  it("exporta exatamente as obras recebidas (o filtro da tela), com SINTETICO e a fórmula neutralizada", async () => {
    const usuario = userEvent.setup()
    const obras = [
      montarObra({
        id: "x",
        titulo: "=1+1",
        estadoLocalizacao: "dentro-de-bairro",
        bairroId: "uv-10",
      }),
      montarObra({ id: "y", titulo: "@SOMA(A1)" }),
    ]
    render(
      <TabelaObras
        obras={obras}
        bairros={BAIRROS}
        obraSelecionadaId={null}
        onAbrirObra={jest.fn()}
        bairroNome="Centro"
      />
    )

    await usuario.click(
      screen.getByRole("button", { name: "Exportar CSV: lista de obras" })
    )

    const [blob, nome] = jest.mocked(baixarBlob).mock.calls[0]
    expect(nome).toMatch(
      /^acarau-inteligente_obras_\d{4}-\d{2}-\d{2}_centro\.csv$/
    )
    const linhas = await linhasDoCsvBaixado(blob)
    expect(linhas).toHaveLength(3)
    expect(linhas[0]).toContain("Proveniência")
    expect(linhas[1].startsWith("'=1+1;")).toBe(true)
    expect(linhas[1]).toContain(";Centro;")
    expect(linhas[2].startsWith("'@SOMA(A1);")).toBe(true)
    expect(linhas[2]).toContain(";Sem localização;")
    expect(linhas.slice(1).every((linha) => linha.endsWith(";SINTETICO"))).toBe(
      true
    )
  })
})
