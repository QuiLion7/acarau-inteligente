import { screen } from "@testing-library/react"
import { redirect } from "next/navigation"

import PaginaEntrar from "@/app/entrar/page"
import type { SessaoValida } from "@/lib/auth/papeis"
import { obterSessaoAtual } from "@/lib/server/auth/dal"
import { renderComProviders } from "@/test/render-com-providers"

jest.mock("@/lib/server/auth/dal", () => ({ obterSessaoAtual: jest.fn() }))
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  useRouter: () => ({ replace: jest.fn(), refresh: jest.fn() }),
}))

const SESSAO: SessaoValida = {
  usuario: "analista",
  nome: "Analista Demo",
  papel: "analista",
}

class RedirecionamentoSimulado extends Error {}

beforeEach(() => {
  jest.mocked(obterSessaoAtual).mockResolvedValue(null)
  jest.mocked(redirect).mockImplementation(() => {
    throw new RedirecionamentoSimulado()
  })
})

async function renderizar(parametros: Record<string, string | string[]> = {}) {
  renderComProviders(
    await PaginaEntrar({ searchParams: Promise.resolve(parametros) })
  )
}

describe("página Entrar", () => {
  it("mostra o título e o formulário de login ao visitante", async () => {
    await renderizar()

    expect(
      screen.getByRole("heading", { level: 1, name: "Entrar" })
    ).toBeVisible()
    expect(screen.getByLabelText("Usuário")).toBeVisible()
    expect(screen.getByLabelText("Senha")).toBeVisible()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("avisa que é preciso entrar quando o motivo é restrito", async () => {
    await renderizar({ motivo: "restrito" })

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Entre para acessar esta área."
    )
  })

  it("avisa que a sessão expirou quando o motivo é expirada", async () => {
    await renderizar({ motivo: "expirada" })

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Sua sessão expirou. Entre novamente."
    )
  })

  it.each(["constructor", "__proto__", "<b>x</b>", "outro"])(
    "ignora o motivo %s, que não consta na lista, sem exibi-lo",
    async (motivo) => {
      await renderizar({ motivo })

      expect(screen.queryByRole("alert")).toBeNull()
      expect(screen.queryByText(motivo)).toBeNull()
    }
  )

  it("manda quem já tem sessão para o retorno interno", async () => {
    jest.mocked(obterSessaoAtual).mockResolvedValue(SESSAO)

    await expect(renderizar({ retorno: "/analista" })).rejects.toThrow(
      RedirecionamentoSimulado
    )

    expect(redirect).toHaveBeenCalledWith("/analista")
  })

  it.each([
    ["endereço externo", "https://exemplo.com"],
    ["endereço sem esquema", "//exemplo.com"],
    ["a própria página de login", "/entrar?retorno=/analista"],
  ])(
    "manda quem já tem sessão para o início quando o retorno é %s",
    async (_nome, retorno) => {
      jest.mocked(obterSessaoAtual).mockResolvedValue(SESSAO)

      await expect(renderizar({ retorno })).rejects.toThrow(
        RedirecionamentoSimulado
      )

      expect(redirect).toHaveBeenCalledWith("/")
    }
  )

  it("usa o primeiro valor quando o parâmetro vem repetido", async () => {
    jest.mocked(obterSessaoAtual).mockResolvedValue(SESSAO)

    await expect(
      renderizar({ retorno: ["/admin", "/analista"] })
    ).rejects.toThrow(RedirecionamentoSimulado)

    expect(redirect).toHaveBeenCalledWith("/admin")
  })
})
