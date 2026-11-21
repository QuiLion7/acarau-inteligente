import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { RelatorioImportacao } from "@/components/datasets/relatorio-importacao"
import { datasetsClient } from "@/lib/api/datasets-client"
import { ApiError } from "@/lib/api/api-error"
import type { RelatorioVersao } from "@/lib/validations/datasets-schema"
import { renderComProviders } from "@/test/render-com-providers"

jest.mock("@/lib/api/datasets-client", () => ({
  datasetsClient: { relatorio: jest.fn() },
}))

const RELATORIO: RelatorioVersao = {
  versao: {
    id: "v1",
    numero: 1,
    situacao: "publicado",
    autor: "Analista Demo",
    importadoEm: "2026-11-20T14:02:11.000Z",
    publicadoEm: "2026-11-20T15:00:00.000Z",
    granularidade: "ano",
    periodos: ["2025", "2026"],
    linhasGravadas: 16,
  },
  dataset: {
    id: "d1",
    nome: "Roteiro 2025-2026",
    indicador: "Casos notificados (sintético)",
    fonte: "Planilha de roteiro",
    unidade: "casos",
    proveniencia: "SINTETICO",
    preCarregado: false,
  },
  relatorio: {
    nomeArquivo: "saude-roteiro_DEMO.csv",
    hashConteudo: "ab".repeat(32),
    separador: ";",
    encoding: "UTF-8 com BOM",
    mapeamento: { bairro: "bairro", periodo: "ano", casos: "casos" },
    colunasIgnoradas: ["observacao"],
    decisoesBairro: [
      {
        nomeOriginal: "Centro",
        destino: { tipo: "bairro", bairroId: "uv-10", nome: "Centro" },
        origem: "automatica",
        linhas: 2,
      },
      {
        nomeOriginal: "Morada",
        destino: {
          tipo: "bairro",
          bairroId: "uv-20",
          nome: "Morada dos Ventos",
        },
        origem: "manual",
        linhas: 2,
      },
      {
        nomeOriginal: "Aranaú",
        destino: { tipo: "fora-da-cobertura" },
        origem: "manual",
        linhas: 2,
      },
    ],
    contagens: {
      lidas: 16,
      gravadas: 16,
      semDado: 1,
      foraDaCobertura: 2,
      avisos: 1,
    },
    granularidade: "ano",
    periodos: ["2025", "2026"],
  },
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(datasetsClient.relatorio).mockResolvedValue(RELATORIO)
})

describe("RelatorioImportacao (CA-02.16)", () => {
  it("fechado não consulta o servidor nem mostra o painel", () => {
    renderComProviders(
      <RelatorioImportacao versaoId={null} onFechar={jest.fn()} />
    )

    expect(datasetsClient.relatorio).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("mostra autor, data, arquivo, separador, encoding, colunas, contagens, versão, indicador, fonte e SINTETICO", async () => {
    renderComProviders(
      <RelatorioImportacao versaoId="v1" onFechar={jest.fn()} />
    )

    const painel = within(await screen.findByRole("dialog"))
    expect(await painel.findByText("Analista Demo")).toBeVisible()
    expect(painel.getByText("20/11/2026, 11:02")).toBeVisible()
    expect(painel.getByText("saude-roteiro_DEMO.csv")).toBeVisible()
    expect(painel.getByText("Ponto e vírgula (;)")).toBeVisible()
    expect(painel.getByText("UTF-8 com BOM")).toBeVisible()
    expect(painel.getByText("ab".repeat(32))).toBeVisible()
    expect(painel.getByText("observacao")).toBeVisible()
    expect(painel.getByText("Casos notificados (sintético)")).toBeVisible()
    expect(painel.getByText("Planilha de roteiro")).toBeVisible()
    expect(painel.getByText("SINTETICO")).toBeVisible()
    expect(
      painel.getByText("Fora da cobertura", { selector: "dt" })
        .nextElementSibling
    ).toHaveTextContent("2")
    expect(painel.getByText("Sem dado").nextElementSibling).toHaveTextContent(
      "1"
    )
  })

  it("lista as decisões de bairro, automáticas e manuais, e as que ficaram fora da cobertura", async () => {
    renderComProviders(
      <RelatorioImportacao versaoId="v1" onFechar={jest.fn()} />
    )

    const tabela = within(await screen.findByRole("table"))

    const linhaCentro = within(tabela.getByRole("row", { name: /Centro/ }))
    expect(linhaCentro.getByText("Automática")).toBeVisible()
    const linhaMorada = within(tabela.getByRole("row", { name: /Morada/ }))
    expect(linhaMorada.getByText("Morada dos Ventos (uv-20)")).toBeVisible()
    expect(linhaMorada.getByText("Manual")).toBeVisible()
    const linhaAranau = within(tabela.getByRole("row", { name: /Aranaú/ }))
    expect(linhaAranau.getByText("Fora da cobertura")).toBeVisible()
  })

  it("falha ao carregar mostra o erro do servidor dentro do painel", async () => {
    jest
      .mocked(datasetsClient.relatorio)
      .mockRejectedValue(
        new ApiError("NAO_ENCONTRADO", "Recurso não encontrado.")
      )
    renderComProviders(
      <RelatorioImportacao versaoId="v1" onFechar={jest.fn()} />
    )

    const painel = within(await screen.findByRole("dialog"))

    expect(await painel.findByText("Recurso não encontrado.")).toBeVisible()
  })

  it("Fechar avisa quem abriu", async () => {
    const onFechar = jest.fn()
    const usuario = userEvent.setup()
    renderComProviders(
      <RelatorioImportacao versaoId="v1" onFechar={onFechar} />
    )

    await usuario.click(await screen.findByRole("button", { name: "Fechar" }))

    expect(onFechar).toHaveBeenCalled()
  })
})
