import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { Map as MapaMapLibre } from "maplibre-gl"
import { toast } from "sonner"

import { BotaoBaixarMapa } from "@/components/exportacao/botao-baixar-mapa"
import { baixarBlob } from "@/lib/exportacao/baixar-arquivo"
import { capturarMapa, comporImagemMapa } from "@/lib/exportacao/mapa-png"
import { legendaDosBairros } from "@/lib/exportacao/legendas-png"
import { montarMolduraPng } from "@/lib/exportacao/moldura-png"

// A captura e a composição dependem de canvas e WebGL (E2E-04): aqui só importa o que o botão decide e entrega.
jest.mock("@/lib/exportacao/mapa-png", () => ({
  capturarMapa: jest.fn(),
  comporImagemMapa: jest.fn(),
}))
jest.mock("@/lib/exportacao/baixar-arquivo", () => ({ baixarBlob: jest.fn() }))
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }))

const MAPA = {} as MapaMapLibre
const MOLDURA = montarMolduraPng({
  titulo: "Obras",
  bairro: "Centro",
  legenda: legendaDosBairros(false),
  sintetico: true,
})
const PNG = new Blob(["png"], { type: "image/png" })

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(capturarMapa).mockResolvedValue({
    imagem: {} as HTMLCanvasElement,
    semFundo: false,
  })
  jest.mocked(comporImagemMapa).mockResolvedValue(PNG)
})

describe("BotaoBaixarMapa (RF-05.22, RF-05.23)", () => {
  it("fica desabilitado até o mapa carregar", () => {
    const { rerender } = render(
      <BotaoBaixarMapa mapa={null} moldura={MOLDURA} tipo="mapa-obras" />
    )
    expect(
      screen.getByRole("button", { name: "Baixar mapa (PNG)" })
    ).toBeDisabled()

    rerender(
      <BotaoBaixarMapa mapa={MAPA} moldura={MOLDURA} tipo="mapa-obras" />
    )

    expect(
      screen.getByRole("button", { name: "Baixar mapa (PNG)" })
    ).toBeEnabled()
  })

  it("captura o mapa, compõe a imagem com a moldura e baixa o PNG com o nome de produto, tipo, data e bairro", async () => {
    const usuario = userEvent.setup()
    render(
      <BotaoBaixarMapa
        mapa={MAPA}
        moldura={MOLDURA}
        tipo="mapa-obras"
        bairro="Centro"
      />
    )

    await usuario.click(
      screen.getByRole("button", { name: "Baixar mapa (PNG)" })
    )

    await waitFor(() => expect(baixarBlob).toHaveBeenCalledTimes(1))
    expect(capturarMapa).toHaveBeenCalledWith(MAPA)
    expect(comporImagemMapa).toHaveBeenCalledWith(
      expect.objectContaining({ semFundo: false }),
      MOLDURA,
      expect.any(Date)
    )
    const [blob, nome] = jest.mocked(baixarBlob).mock.calls[0]
    expect(blob).toBe(PNG)
    expect(nome).toMatch(
      /^acarau-inteligente_mapa-obras_\d{4}-\d{2}-\d{2}_centro\.png$/
    )
  })

  it("enquanto gera, o botão fica desabilitado e volta depois", async () => {
    const usuario = userEvent.setup()
    let concluir: (blob: Blob) => void = () => undefined
    jest.mocked(comporImagemMapa).mockReturnValue(
      new Promise((resolve) => {
        concluir = resolve
      })
    )
    render(<BotaoBaixarMapa mapa={MAPA} moldura={MOLDURA} tipo="mapa-obras" />)

    await usuario.click(
      screen.getByRole("button", { name: "Baixar mapa (PNG)" })
    )

    expect(
      screen.getByRole("button", { name: "Baixar mapa (PNG)" })
    ).toBeDisabled()
    concluir(PNG)
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Baixar mapa (PNG)" })
      ).toBeEnabled()
    )
  })

  it("com falha mostra a mensagem recuperável em toast, sem detalhe técnico, e não baixa nada", async () => {
    const usuario = userEvent.setup()
    jest.spyOn(console, "error").mockImplementation(() => undefined)
    jest
      .mocked(capturarMapa)
      .mockRejectedValue(new Error("SecurityError: tainted canvas"))
    render(<BotaoBaixarMapa mapa={MAPA} moldura={MOLDURA} tipo="mapa-obras" />)

    await usuario.click(
      screen.getByRole("button", { name: "Baixar mapa (PNG)" })
    )

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Não foi possível baixar o mapa. Tente de novo."
      )
    )
    expect(baixarBlob).not.toHaveBeenCalled()
    expect(
      screen.getByRole("button", { name: "Baixar mapa (PNG)" })
    ).toBeEnabled()
  })
})
