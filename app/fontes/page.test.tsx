import { render, screen, within } from "@testing-library/react"

import PaginaFontes from "@/app/fontes/page"
import {
  listarDatasetsPublicados,
  type DatasetPublicado,
} from "@/lib/server/datasets/dataset-repositorio"
import { resumirObrasParaFontes } from "@/lib/server/obras/obra-repositorio"

jest.mock("@/lib/server/db/cliente", () => ({
  obterBanco: jest.fn(() => ({})),
}))
jest.mock("@/lib/server/datasets/dataset-repositorio", () => ({
  listarDatasetsPublicados: jest.fn(),
}))
jest.mock("@/lib/server/obras/obra-repositorio", () => ({
  resumirObrasParaFontes: jest.fn(),
}))

const PUBLICADO: DatasetPublicado = {
  dataset: {
    id: "d1",
    nome: "Casos de saúde 2024-2026 (exemplo)",
    indicador: "Casos notificados (sintético)",
    fonte: "Dado sintético da demonstração",
    unidade: "casos",
    proveniencia: "SINTETICO",
    preCarregado: true,
  },
  versao: {
    id: "v1",
    numero: 1,
    situacao: "publicado",
    autor: "Carga da demonstração",
    importadoEm: "2026-11-20T14:02:11.000Z",
    publicadoEm: "2026-11-20T14:02:11.000Z",
    granularidade: "ano",
    periodos: ["2024", "2025", "2026"],
    linhasGravadas: 54,
  },
}

beforeEach(() => {
  jest.mocked(listarDatasetsPublicados).mockResolvedValue([])
  jest.mocked(resumirObrasParaFontes).mockResolvedValue({
    quantidade: 8,
    ultimaAtualizacao: "2026-11-15T12:00:00.000Z",
  })
})

describe("PaginaFontes", () => {
  it("lista exatamente bairros, escolas, limite municipal e mapa base, cada um com seus campos", async () => {
    render(await PaginaFontes())

    const cartoes = screen.getAllByRole("article")

    expect(
      cartoes.map(
        (cartao) =>
          within(cartao).getByRole("heading", { level: 2 }).textContent
      )
    ).toEqual([
      "Bairros (Unidades de Vizinhança)",
      "Escolas",
      "Limite municipal",
      "Mapa base",
    ])
    for (const cartao of cartoes) {
      for (const rotulo of [
        "Fonte:",
        "Etiqueta:",
        "Versão:",
        "Data de referência:",
        "Cobertura:",
      ]) {
        expect(cartao).toHaveTextContent(rotulo)
      }
      expect(
        within(cartao).getByRole("heading", { level: 3 })
      ).toHaveTextContent("Limitações conhecidas")
      expect(within(cartao).getAllByRole("listitem").length).toBeGreaterThan(0)
    }
  })

  it("mostra 'Não informada' na data das camadas de carga e as etiquetas de proveniência", async () => {
    render(await PaginaFontes())

    const bairros = screen.getByRole("article", {
      name: "Bairros (Unidades de Vizinhança)",
    })
    const mapaBase = screen.getByRole("article", { name: "Mapa base" })

    expect(bairros).toHaveTextContent("Data de referência:Não informada")
    expect(bairros).toHaveTextContent("Etiqueta:DERIVADO_VALIDAR")
    expect(bairros).toHaveTextContent(
      "não é arquivo oficial homologado da Prefeitura"
    )
    expect(mapaBase).toHaveTextContent("Etiqueta:COLABORATIVO")
    expect(mapaBase).toHaveTextContent("OpenStreetMap, licença ODbL")
  })

  it("não lista lagoas, distritos, ruas, rios nem setores", async () => {
    render(await PaginaFontes())

    expect(document.body).not.toHaveTextContent(
      /lagoa|distrito|ruas|rios|setores/i
    )
  })

  it("lista o dataset publicado ao lado das camadas, com nome, indicador, versão, fonte, períodos, data e SINTETICO (CA-02.31)", async () => {
    jest.mocked(listarDatasetsPublicados).mockResolvedValue([PUBLICADO])

    render(await PaginaFontes())

    expect(screen.getAllByRole("article")).toHaveLength(5)
    const cartao = screen.getByRole("article", {
      name: "Casos de saúde 2024-2026 (exemplo)",
    })
    for (const texto of [
      "Casos notificados (sintético)",
      "Dado sintético da demonstração",
      "2024 a 2026",
      "20/11/2026, 11:02",
      "SINTETICO",
    ]) {
      expect(cartao).toHaveTextContent(texto)
    }
    expect(
      within(cartao).getByText("Versão:").nextElementSibling
    ).toHaveTextContent("1")
  })

  it("sem dataset publicado diz isso, sem inventar cartão", async () => {
    render(await PaginaFontes())

    expect(
      screen.getByText("Nenhum dataset de saúde está publicado no momento.")
    ).toBeVisible()
  })

  it("lista as obras com origem sintética, quantidade, última atualização e o aviso, fora das camadas (CA-04.23)", async () => {
    render(await PaginaFontes())

    const secao = screen.getByRole("region", { name: "Obras cadastradas" })
    expect(secao).toHaveTextContent("SINTETICO")
    expect(secao).toHaveTextContent("Origem:Sintética: criadas na demonstração")
    expect(secao).toHaveTextContent("Quantidade:8 obras")
    expect(secao).toHaveTextContent("Última atualização:15/11/2026 09:00")
    expect(secao).toHaveTextContent("Não são obras municipais")
    // Obra não é camada do artefato: continua só com os 4 cartões de camada (DV-21, DEC-T-11).
    expect(screen.getAllByRole("article")).toHaveLength(4)
  })

  it("sem obra diz que não há nenhuma e não inventa data", async () => {
    jest
      .mocked(resumirObrasParaFontes)
      .mockResolvedValue({ quantidade: 0, ultimaAtualizacao: null })

    render(await PaginaFontes())

    const secao = screen.getByRole("region", { name: "Obras cadastradas" })
    expect(secao).toHaveTextContent("Quantidade:Nenhuma obra cadastrada")
    expect(secao).not.toHaveTextContent("Última atualização")
  })
})
