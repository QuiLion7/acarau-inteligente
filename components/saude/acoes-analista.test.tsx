import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { AcoesAnalista } from "@/components/saude/acoes-analista"
import { ApiError } from "@/lib/api/api-error"
import { datasetsClient } from "@/lib/api/datasets-client"
import { renderComProviders } from "@/test/render-com-providers"

const refresh = jest.fn()

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))
jest.mock("@/lib/api/datasets-client", () => ({
  datasetsClient: { publicar: jest.fn(), despublicar: jest.fn() },
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

beforeEach(() => jest.clearAllMocks())

describe("AcoesAnalista", () => {
  it("versão privada oferece Publicar e, depois de publicar, relê a página", async () => {
    jest.mocked(datasetsClient.publicar).mockResolvedValue({} as never)
    const usuario = userEvent.setup()
    renderComProviders(
      <AcoesAnalista versao={{ id: "v-2", situacao: "privado" }} />
    )

    await usuario.click(
      screen.getByRole("button", { name: "Publicar esta versão" })
    )

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    expect(datasetsClient.publicar).toHaveBeenCalledWith(
      "v-2",
      expect.anything()
    )
    expect(datasetsClient.despublicar).not.toHaveBeenCalled()
  })

  it("versão publicada oferece Despublicar", async () => {
    jest.mocked(datasetsClient.despublicar).mockResolvedValue({} as never)
    const usuario = userEvent.setup()
    renderComProviders(
      <AcoesAnalista versao={{ id: "v-1", situacao: "publicado" }} />
    )

    await usuario.click(
      screen.getByRole("button", { name: "Despublicar esta versão" })
    )

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    expect(datasetsClient.despublicar).toHaveBeenCalledWith(
      "v-1",
      expect.anything()
    )
    expect(screen.queryByRole("button", { name: /Publicar esta/ })).toBeNull()
  })

  it("se a publicação falha, a página não é relida", async () => {
    jest
      .mocked(datasetsClient.publicar)
      .mockRejectedValue(
        new ApiError("NAO_AUTENTICADO", "Entre.", { status: 401 })
      )
    const usuario = userEvent.setup()
    renderComProviders(
      <AcoesAnalista versao={{ id: "v-2", situacao: "privado" }} />
    )

    await usuario.click(
      screen.getByRole("button", { name: "Publicar esta versão" })
    )

    await waitFor(() => expect(datasetsClient.publicar).toHaveBeenCalled())
    expect(refresh).not.toHaveBeenCalled()
  })

  it("leva à importação e à lista de datasets", () => {
    renderComProviders(
      <AcoesAnalista versao={{ id: "v-1", situacao: "publicado" }} />
    )

    expect(screen.getByRole("link", { name: "Importar CSV" })).toHaveAttribute(
      "href",
      "/saude/importar"
    )
    expect(screen.getByRole("link", { name: "Datasets" })).toHaveAttribute(
      "href",
      "/saude/datasets"
    )
  })
})
