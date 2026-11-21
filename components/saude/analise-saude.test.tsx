import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { AnaliseSaude } from "@/components/saude/analise-saude"
import { datasetsClient } from "@/lib/api/datasets-client"
import type { AnaliseDatasetSaude } from "@/lib/saude/analise-dataset"
import { renderComProviders } from "@/test/render-com-providers"
import { obterDadosMapaResumo } from "@/lib/server/territorio/territorio-repositorio"
import { ANALISE_SAUDE } from "@/test/saude-fixtures"

const replace = jest.fn()
const refresh = jest.fn()
let consulta = ""

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
  usePathname: () => "/saude",
  useSearchParams: () => new URLSearchParams(consulta),
}))
jest.mock("@/lib/api/datasets-client", () => ({
  datasetsClient: { publicar: jest.fn(), despublicar: jest.fn() },
}))
// O MapLibre e o ECharts não rodam em jsdom: os doubles mostram o que a análise lhes entrega e deixam clicar.
jest.mock("@/components/territorio/mapa-territorio", () => ({
  MapaTerritorio: ({
    coropletico,
    selecionadoId,
    onSelecionar,
  }: {
    coropletico?: Record<string, { situacao: string; classe: number | null }>
    selecionadoId?: string | null
    onSelecionar: (id: string) => void
  }) => (
    <div role="group" aria-label="Mapa (double)">
      <p>Destaque: {selecionadoId ?? "nenhum"}</p>
      <p>Centro no mapa: {JSON.stringify(coropletico?.["uv-10"])}</p>
      <p>Rodagem no mapa: {JSON.stringify(coropletico?.["uv-13"])}</p>
      <button onClick={() => onSelecionar("uv-20")}>
        clicar em Morada no mapa
      </button>
    </div>
  ),
}))
jest.mock("@/components/saude/grafico-periodos", () => ({
  GraficoPeriodos: ({ bairro }: { bairro: { nome: string } | null }) => (
    <p>Gráfico de {bairro ? bairro.nome : "todos os bairros"}</p>
  ),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

function renderizar(
  analise: AnaliseDatasetSaude = ANALISE_SAUDE,
  parametros = ""
) {
  consulta = parametros
  return renderComProviders(
    <AnaliseSaude analise={analise} mapa={obterDadosMapaResumo()} />
  )
}

beforeEach(() => jest.clearAllMocks())

describe("AnaliseSaude: o período mais recente por padrão", () => {
  it("mostra o dataset, o total, a legenda, o ranking e a tabela de 2026, com as mesmas contagens", () => {
    renderizar()

    expect(
      screen.getByRole("heading", { name: "Roteiro 2025-2026" })
    ).toBeVisible()
    expect(
      screen.getByText("Soma dos 2 bairros com dados no período.")
    ).toBeVisible()
    const total = within(
      screen.getByRole("heading", { name: "Total do período" })
        .parentElement as HTMLElement
    )
    expect(total.getByText("51")).toBeVisible()
    const ranking = within(screen.getByRole("list", { name: "" }))
    expect(
      ranking.getAllByRole("listitem").map((item) => item.textContent)
    ).toEqual(["Centro51 casos", "Outra Banda0 casos"])
    const rodagem = screen.getByRole("row", { name: /Rodagem/ })
    expect(within(rodagem).getByText("sem dados")).toBeVisible()
    expect(screen.getByText(/Unidade: casos. Período: 2026/)).toBeVisible()
  })

  it("trocar o período na URL recalcula tudo sem refazer nenhuma requisição ao servidor", () => {
    renderizar(ANALISE_SAUDE, "periodo=2025")

    expect(
      screen.getByText("Soma dos 3 bairros com dados no período.")
    ).toBeVisible()
    expect(
      within(
        screen.getByRole("heading", { name: "Total do período" })
          .parentElement as HTMLElement
      ).getByText("30")
    ).toBeVisible()
    expect(
      screen.getByText(
        "Fora da cobertura: 6 casos em 1 localidade, fora do total e fora do mapa."
      )
    ).toBeVisible()
    expect(datasetsClient.publicar).not.toHaveBeenCalled()
  })

  it("o seletor escreve o período escolhido na URL, preservando o resto", async () => {
    const usuario = userEvent.setup()
    renderizar(ANALISE_SAUDE, "bairro=uv-10")

    await usuario.click(screen.getByRole("combobox", { name: "Período" }))
    await usuario.click(await screen.findByRole("option", { name: "2025" }))

    expect(replace).toHaveBeenCalledWith("/saude?bairro=uv-10&periodo=2025", {
      scroll: false,
    })
  })
})

describe("AnaliseSaude: período que o dataset não tem (TU-18, CA-02.27)", () => {
  it("mostra período sem dados com a opção de limpar, e nenhum valor de outro período", async () => {
    const usuario = userEvent.setup()
    renderizar(ANALISE_SAUDE, "periodo=1999")

    expect(
      screen.getByRole("heading", { name: "Período sem dados" })
    ).toBeVisible()
    expect(screen.queryByRole("table")).toBeNull()
    expect(screen.queryByText("51")).toBeNull()
    expect(screen.queryByText(/Soma d/)).toBeNull()
    expect(screen.queryByText("1999")).toBeNull()

    await usuario.click(screen.getByRole("button", { name: "Limpar período" }))

    expect(replace).toHaveBeenCalledWith("/saude", { scroll: false })
  })
})

describe("AnaliseSaude: bairro selecionado (RF-02.35)", () => {
  it("destaca o bairro da URL no ranking e na tabela", () => {
    renderizar(ANALISE_SAUDE, "bairro=uv-10")

    const marcados = screen
      .getAllByRole("button", { name: "Centro" })
      .map((botao) => botao.getAttribute("aria-current"))
    expect(marcados).toEqual(["true", "true"])
  })

  it("selecionar no ranking escreve o bairro na URL", async () => {
    const usuario = userEvent.setup()
    renderizar()
    const ranking = screen.getByRole("heading", { name: "Ranking dos bairros" })
      .parentElement as HTMLElement

    await usuario.click(
      within(ranking).getByRole("button", { name: "Outra Banda" })
    )

    expect(replace).toHaveBeenCalledWith("/saude?bairro=uv-01", {
      scroll: false,
    })
  })

  it("bairro da URL que não existe não destaca ninguém nem exibe o texto recebido", () => {
    renderizar(ANALISE_SAUDE, "bairro=<b>x</b>")

    expect(screen.queryAllByRole("button", { current: true })).toHaveLength(0)
    expect(screen.queryByText(/<b>/)).toBeNull()
  })
})

describe("AnaliseSaude: mapa e gráfico (RF-02.31, RF-02.38, CA-02.19)", () => {
  it("o mapa recebe a situação e a classe do período, do mesmo objeto que a legenda e a tabela leem", async () => {
    renderizar(ANALISE_SAUDE, "periodo=2026")

    const mapa = await screen.findByRole("group", { name: "Mapa (double)" })
    expect(within(mapa).getByText(/Centro no mapa/)).toHaveTextContent(
      '{"situacao":"valor","classe":1}'
    )
    expect(within(mapa).getByText(/Rodagem no mapa/)).toHaveTextContent(
      '{"situacao":"sem-dados","classe":null}'
    )
    expect(
      within(screen.getByRole("row", { name: /Centro/ })).getByText("51")
    ).toBeVisible()
  })

  it("trocar o período troca os dados do mesmo mapa, que não some", async () => {
    const { rerender } = renderizar(ANALISE_SAUDE, "periodo=2025")
    const mapa = await screen.findByRole("group", { name: "Mapa (double)" })
    expect(within(mapa).getByText(/Centro no mapa/)).toHaveTextContent(
      '"classe":1'
    )
    expect(within(mapa).getByText(/Rodagem no mapa/)).toHaveTextContent(
      '"situacao":"valor"'
    )

    consulta = "periodo=2026"
    rerender(
      <AnaliseSaude analise={ANALISE_SAUDE} mapa={obterDadosMapaResumo()} />
    )

    expect(
      within(screen.getByRole("group", { name: "Mapa (double)" })).getByText(
        /Rodagem no mapa/
      )
    ).toHaveTextContent('"situacao":"sem-dados"')
  })

  it("clicar num bairro no mapa seleciona o mesmo bairro pela URL, como no ranking e na tabela", async () => {
    const usuario = userEvent.setup()
    renderizar()
    await screen.findByRole("group", { name: "Mapa (double)" })

    await usuario.click(
      screen.getByRole("button", { name: "clicar em Morada no mapa" })
    )

    expect(replace).toHaveBeenCalledWith("/saude?bairro=uv-20", {
      scroll: false,
    })
  })

  it("o bairro da URL é o destaque do mapa e a série do gráfico", async () => {
    renderizar(ANALISE_SAUDE, "bairro=uv-10")

    expect(await screen.findByText("Destaque: uv-10")).toBeVisible()
    expect(await screen.findByText("Gráfico de Centro")).toBeVisible()
  })

  it("sem bairro, o gráfico é a soma de todos os bairros", async () => {
    renderizar()

    expect(await screen.findByText("Gráfico de todos os bairros")).toBeVisible()
  })

  it("período sem dados não mostra mapa nem gráfico", () => {
    renderizar(ANALISE_SAUDE, "periodo=1999")

    expect(screen.queryByRole("group", { name: "Mapa (double)" })).toBeNull()
    expect(screen.queryByText(/Gráfico de/)).toBeNull()
  })
})

describe("AnaliseSaude: taxa (TU-27, CA-02.25)", () => {
  it("explica que a taxa exige a população e não mostra nenhuma taxa", () => {
    renderizar()

    expect(
      screen.getByText(
        "A taxa exige a população de cada bairro no período, que a demonstração não tem. Por isso mostramos contagens."
      )
    ).toBeVisible()
    expect(screen.queryByText(/por 100/i)).toBeNull()
    expect(screen.queryByText(/%/)).toBeNull()
    expect(screen.queryByRole("columnheader", { name: /taxa/i })).toBeNull()
  })
})

describe("AnaliseSaude: papéis e versões (RF-02.28)", () => {
  it("o visitante, com uma versão só, não vê seletor de versão nem as ações do analista", () => {
    renderizar()

    expect(
      screen.queryByRole("combobox", { name: "Dataset e versão" })
    ).toBeNull()
    expect(screen.queryByRole("link", { name: "Importar CSV" })).toBeNull()
    expect(screen.queryByRole("button", { name: /Publicar/ })).toBeNull()
  })

  it("o analista vê as ações e o seletor de versão quando há mais de uma, com a privada marcada", async () => {
    const usuario = userEvent.setup()
    renderizar({
      ...ANALISE_SAUDE,
      podeGerenciar: true,
      opcoes: [
        {
          id: "v-1",
          rotulo: "Roteiro 2025-2026, versão 1",
          situacao: "publicado",
        },
        {
          id: "v-2",
          rotulo: "Roteiro 2025-2026, versão 2",
          situacao: "privado",
        },
      ],
    })

    expect(screen.getByRole("link", { name: "Importar CSV" })).toHaveAttribute(
      "href",
      "/saude/importar"
    )
    expect(screen.getByRole("link", { name: "Datasets" })).toHaveAttribute(
      "href",
      "/saude/datasets"
    )
    await usuario.click(
      screen.getByRole("combobox", { name: "Dataset e versão" })
    )
    expect(
      await screen.findByRole("option", {
        name: "Roteiro 2025-2026, versão 2 (privado)",
      })
    ).toBeVisible()
  })

  it("escolher outra versão a escreve na URL, preservando o período", async () => {
    const usuario = userEvent.setup()
    renderizar(
      {
        ...ANALISE_SAUDE,
        opcoes: [
          {
            id: "v-1",
            rotulo: "Roteiro 2025-2026, versão 1",
            situacao: "publicado",
          },
          {
            id: "v-2",
            rotulo: "Outro dataset, versão 1",
            situacao: "publicado",
          },
        ],
      },
      "periodo=2025"
    )

    await usuario.click(
      screen.getByRole("combobox", { name: "Dataset e versão" })
    )
    await usuario.click(
      await screen.findByRole("option", { name: "Outro dataset, versão 1" })
    )

    expect(replace).toHaveBeenCalledWith("/saude?periodo=2025&versao=v-2", {
      scroll: false,
    })
  })
})
