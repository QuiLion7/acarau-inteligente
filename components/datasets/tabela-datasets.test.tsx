import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { TabelaDatasets } from "@/components/datasets/tabela-datasets"
import { ApiError } from "@/lib/api/api-error"
import { datasetsClient } from "@/lib/api/datasets-client"
import type {
  DatasetComVersoes,
  VersaoResumo,
} from "@/lib/validations/datasets-schema"
import { renderComProviders } from "@/test/render-com-providers"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/lib/api/datasets-client", () => ({
  datasetsClient: {
    listar: jest.fn(),
    relatorio: jest.fn(),
    publicar: jest.fn(),
    despublicar: jest.fn(),
  },
}))

const DATASET_BASE = {
  nome: "Roteiro 2025-2026",
  indicador: "Casos notificados (sintético)",
  fonte: "Planilha de roteiro",
  unidade: "casos",
  proveniencia: "SINTETICO",
  preCarregado: false,
} as const

const VERSAO_BASE: Pick<
  VersaoResumo,
  "autor" | "importadoEm" | "granularidade" | "periodos" | "linhasGravadas"
> = {
  autor: "Analista Demo",
  importadoEm: "2026-11-20T14:02:11.000Z",
  granularidade: "ano",
  periodos: ["2025", "2026"],
  linhasGravadas: 16,
}

// Um publicado (v1 do roteiro) e um privado com duas versões, como no CA-02.36.
const DATASETS: DatasetComVersoes[] = [
  {
    ...DATASET_BASE,
    id: "d-roteiro",
    versoes: [
      {
        ...VERSAO_BASE,
        id: "v-roteiro-2",
        numero: 2,
        situacao: "privado",
        publicadoEm: null,
      },
      {
        ...VERSAO_BASE,
        id: "v-roteiro-1",
        numero: 1,
        situacao: "publicado",
        publicadoEm: "2026-11-20T15:00:00.000Z",
      },
    ],
  },
  {
    ...DATASET_BASE,
    id: "d-outro",
    nome: "Outro dataset",
    indicador: "Atendimentos",
    versoes: [
      {
        ...VERSAO_BASE,
        id: "v-outro-1",
        numero: 1,
        situacao: "privado",
        publicadoEm: null,
        periodos: ["2026"],
        linhasGravadas: 1200,
      },
    ],
  },
]

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(datasetsClient.listar).mockResolvedValue(DATASETS)
})

function linhaDe(nome: string, versao: number) {
  const linhas = screen.getAllByRole("row")
  const linha = linhas.find(
    (candidata) =>
      within(candidata).queryByText(nome) &&
      within(candidata).queryByText(String(versao), { selector: "td" })
  )
  if (!linha) throw new Error(`linha de ${nome} v${versao} ausente`)
  return linha
}

describe("TabelaDatasets (TI-12 na tela, CA-02.36)", () => {
  it("lista nome, indicador, versão, situação, autor, data, períodos e linhas de cada versão", async () => {
    renderComProviders(<TabelaDatasets />)

    await screen.findByRole("table")

    const roteiro2 = within(linhaDe("Roteiro 2025-2026", 2))
    expect(roteiro2.getByText("Privado")).toBeVisible()
    const roteiro1 = within(linhaDe("Roteiro 2025-2026", 1))
    expect(roteiro1.getByText("Publicado")).toBeVisible()
    expect(roteiro1.getByText("Casos notificados (sintético)")).toBeVisible()
    expect(roteiro1.getByText("Analista Demo")).toBeVisible()
    expect(roteiro1.getByText("20/11/2026, 11:02")).toBeVisible()
    expect(roteiro1.getByText("2025 a 2026")).toBeVisible()
    expect(roteiro1.getByText("16")).toBeVisible()
    const outro = within(linhaDe("Outro dataset", 1))
    expect(outro.getByText("2026")).toBeVisible()
    expect(outro.getByText("1.200")).toBeVisible()
  })

  it("cada versão tem o link para vê-la na Saúde", async () => {
    renderComProviders(<TabelaDatasets />)
    await screen.findByRole("table")

    const link = within(linhaDe("Outro dataset", 1)).getByRole("link", {
      name: "Ver na Saúde: Outro dataset, versão 1",
    })

    expect(link).toHaveAttribute("href", "/saude?versao=v-outro-1")
  })

  it("publicar uma versão privada chama o servidor e relê a lista", async () => {
    jest
      .mocked(datasetsClient.publicar)
      .mockResolvedValue(DATASETS[1]?.versoes[0] as never)
    const usuario = userEvent.setup()
    renderComProviders(<TabelaDatasets />)
    await screen.findByRole("table")

    await usuario.click(
      screen.getByRole("button", { name: "Publicar Outro dataset, versão 1" })
    )

    await waitFor(() =>
      expect(datasetsClient.publicar).toHaveBeenCalledWith(
        "v-outro-1",
        expect.anything()
      )
    )
    await waitFor(() => expect(datasetsClient.listar).toHaveBeenCalledTimes(2))
  })

  it("a versão publicada oferece Despublicar, não Publicar", async () => {
    jest
      .mocked(datasetsClient.despublicar)
      .mockResolvedValue(DATASETS[0]?.versoes[1] as never)
    const usuario = userEvent.setup()
    renderComProviders(<TabelaDatasets />)
    await screen.findByRole("table")
    expect(
      screen.queryByRole("button", {
        name: "Publicar Roteiro 2025-2026, versão 1",
      })
    ).toBeNull()

    await usuario.click(
      screen.getByRole("button", {
        name: "Despublicar Roteiro 2025-2026, versão 1",
      })
    )

    await waitFor(() =>
      expect(datasetsClient.despublicar).toHaveBeenCalledWith(
        "v-roteiro-1",
        expect.anything()
      )
    )
  })

  it("sem nenhum dataset mostra o vazio com o caminho para importar", async () => {
    jest.mocked(datasetsClient.listar).mockResolvedValue([])
    renderComProviders(<TabelaDatasets />)

    expect(await screen.findByText("Nenhum dataset importado")).toBeVisible()
    expect(screen.getByRole("link", { name: "Importar CSV" })).toHaveAttribute(
      "href",
      "/saude/importar"
    )
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("falha ao listar mostra o erro com a mensagem do servidor, sem tabela", async () => {
    jest
      .mocked(datasetsClient.listar)
      .mockRejectedValue(new ApiError("ERRO_INTERNO", "Falha no servidor."))
    renderComProviders(<TabelaDatasets />)

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Falha no servidor."
    )
    expect(screen.queryByRole("table")).toBeNull()
  })
})
