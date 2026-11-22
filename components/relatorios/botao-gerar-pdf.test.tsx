import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { BotaoGerarPdf } from "@/components/relatorios/botao-gerar-pdf"
import { gerarPdfRelatorio } from "@/components/relatorios/pdf/gerar-pdf"
import { baixarBlob } from "@/lib/exportacao/baixar-arquivo"
import { relatorioDeTeste } from "@/test/relatorio-fixtures"

// O `@react-pdf/renderer` é ESM e não roda no Jest (TechSpec §8): o módulo do PDF é um stub; o PDF de verdade é do E2E.
jest.mock("@/components/relatorios/pdf/gerar-pdf", () => ({
  gerarPdfRelatorio: jest.fn(),
}))
jest.mock("@/lib/exportacao/baixar-arquivo", () => ({ baixarBlob: jest.fn() }))

const dados = relatorioDeTeste()
const PDF = {
  blob: new Blob(["%PDF-"], { type: "application/pdf" }),
  nome: "acarau-inteligente_relatorio_2026-11-22.pdf",
}

function botao(nome: string) {
  return screen.getByRole("button", { name: nome })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(gerarPdfRelatorio).mockResolvedValue(PDF)
})

describe("BotaoGerarPdf (TU-14, CA-05.08)", () => {
  it("o clique gera o PDF com os dados e a data do clique e baixa o arquivo com o nome devolvido", async () => {
    const usuario = userEvent.setup()
    render(<BotaoGerarPdf dados={dados} />)

    await usuario.click(botao("Gerar PDF"))

    await waitFor(() =>
      expect(baixarBlob).toHaveBeenCalledWith(PDF.blob, PDF.nome)
    )
    expect(gerarPdfRelatorio).toHaveBeenCalledWith(dados, expect.any(Date))
    expect(botao("Gerar PDF")).toBeEnabled()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("enquanto gera, o botão fica desabilitado com o texto de espera e não gera de novo num segundo clique", async () => {
    const usuario = userEvent.setup()
    let concluir: (resultado: typeof PDF) => void = () => undefined
    jest.mocked(gerarPdfRelatorio).mockReturnValue(
      new Promise((resolve) => {
        concluir = resolve
      })
    )
    render(<BotaoGerarPdf dados={dados} />)

    await usuario.click(botao("Gerar PDF"))

    const gerando = await screen.findByRole("button", { name: /Gerando o PDF/ })
    expect(gerando).toBeDisabled()
    await usuario.click(gerando)
    expect(gerarPdfRelatorio).toHaveBeenCalledTimes(1)
    expect(baixarBlob).not.toHaveBeenCalled()

    concluir(PDF)
    await waitFor(() => expect(botao("Gerar PDF")).toBeEnabled())
    expect(baixarBlob).toHaveBeenCalledTimes(1)
  })

  it("com falha mostra a mensagem recuperável e 'Tentar de novo', sem nenhum detalhe técnico, e não baixa nada", async () => {
    const usuario = userEvent.setup()
    jest.spyOn(console, "error").mockImplementation(() => undefined)
    jest
      .mocked(gerarPdfRelatorio)
      .mockRejectedValue(
        new Error("Unknown font format: 0x1234 em Roboto-Regular.ttf")
      )
    render(<BotaoGerarPdf dados={dados} />)

    await usuario.click(botao("Gerar PDF"))

    const alerta = await screen.findByRole("alert")
    expect(alerta).toHaveTextContent(
      "Não foi possível gerar o PDF. Tente de novo."
    )
    expect(alerta).not.toHaveTextContent(/font|Roboto|0x1234|Error/i)
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeEnabled()
    expect(baixarBlob).not.toHaveBeenCalled()
  })

  it("'Tentar de novo' com o serviço normal baixa o PDF e some com a mensagem", async () => {
    const usuario = userEvent.setup()
    jest.spyOn(console, "error").mockImplementation(() => undefined)
    jest
      .mocked(gerarPdfRelatorio)
      .mockRejectedValueOnce(new Error("falhou"))
      .mockResolvedValueOnce(PDF)
    render(<BotaoGerarPdf dados={dados} />)
    await usuario.click(botao("Gerar PDF"))
    await usuario.click(
      await screen.findByRole("button", { name: "Tentar de novo" })
    )

    await waitFor(() =>
      expect(baixarBlob).toHaveBeenCalledWith(PDF.blob, PDF.nome)
    )
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull())
    expect(gerarPdfRelatorio).toHaveBeenCalledTimes(2)
  })

  it("falha ao baixar o arquivo também vira a mensagem recuperável", async () => {
    const usuario = userEvent.setup()
    jest.spyOn(console, "error").mockImplementation(() => undefined)
    jest.mocked(baixarBlob).mockImplementation(() => {
      throw new Error("sem permissão")
    })
    render(<BotaoGerarPdf dados={dados} />)

    await usuario.click(botao("Gerar PDF"))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível gerar o PDF"
    )
  })

  it("ao focar o botão antecipa o carregamento do módulo sem gerar nem mostrar erro", async () => {
    const usuario = userEvent.setup()
    render(<BotaoGerarPdf dados={dados} />)

    await usuario.hover(botao("Gerar PDF"))
    await usuario.tab()

    expect(gerarPdfRelatorio).not.toHaveBeenCalled()
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
