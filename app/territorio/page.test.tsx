import { render, screen } from "@testing-library/react"

import PaginaTerritorio from "@/app/territorio/page"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/territorio",
  useSearchParams: () => new URLSearchParams(),
}))

async function renderizarCom(
  parametros: Record<string, string | string[] | undefined>
) {
  render(await PaginaTerritorio({ searchParams: Promise.resolve(parametros) }))
}

describe("PaginaTerritorio", () => {
  it("deixa de ser 'em breve': mostra o título e o explorador de bairros", async () => {
    await renderizarCom({})

    expect(
      screen.getByRole("heading", { level: 1, name: "Território" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("searchbox", { name: "Buscar bairro" })
    ).toBeInTheDocument()
    expect(screen.getAllByRole("row")).toHaveLength(25)
    expect(screen.queryByText("Disponível em breve")).not.toBeInTheDocument()
  })

  it("com um bairro válido na URL monta o explorador, não o estado de erro", async () => {
    await renderizarCom({ bairro: "uv-10" })

    expect(
      screen.queryByRole("heading", { name: "Bairro não reconhecido" })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("searchbox", { name: "Buscar bairro" })
    ).toBeInTheDocument()
  })

  it.each([
    ["nome em texto livre", "Centro"],
    ["ID inexistente", "uv-99"],
    ["HTML", "<b>x</b>"],
    ["texto longo", "a".repeat(200)],
  ])(
    "mostra 'não reconhecido' para %s, sem repetir o valor, e oferece limpar",
    async (_caso, bairro) => {
      await renderizarCom({ bairro, periodo: "2025" })

      expect(
        screen.getByRole("heading", { name: "Bairro não reconhecido" })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("link", { name: "Limpar bairro" })
      ).toHaveAttribute("href", "/territorio?periodo=2025")
      expect(document.body.textContent).not.toContain(bairro.slice(0, 10))
      expect(document.querySelector("b")).toBeNull()
      expect(screen.queryByRole("searchbox")).not.toBeInTheDocument()
    }
  )

  it("usa o primeiro valor quando o bairro vem repetido na URL", async () => {
    await renderizarCom({ bairro: ["uv-10", "uv-99"] })

    expect(
      screen.queryByRole("heading", { name: "Bairro não reconhecido" })
    ).not.toBeInTheDocument()
  })
})
