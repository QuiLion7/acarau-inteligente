import { render, screen, within } from "@testing-library/react"

import PaginaInicial from "@/app/page"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock("@/components/territorio/mapa-territorio", () => ({
  MapaTerritorio: () => <div role="group" aria-label="Mapa (double)" />,
}))

describe("PaginaInicial", () => {
  it("mantém a apresentação e os 5 atalhos dos módulos", () => {
    render(<PaginaInicial />)

    expect(
      screen.getByRole("heading", { level: 1, name: "Acaraú Inteligente" })
    ).toBeInTheDocument()
    const atalhos = screen.getByRole("region", { name: "Explore os módulos" })
    expect(within(atalhos).getAllByRole("link")).toHaveLength(5)
    expect(
      screen.getByRole("link", { name: "Leia o aviso completo" })
    ).toBeInTheDocument()
  })

  it("ganha a seção do mapa resumido, que carrega o mapa", async () => {
    render(<PaginaInicial />)

    const secao = screen.getByRole("region", {
      name: "Mapa dos bairros da sede",
    })
    expect(secao).toHaveTextContent("Clique em um bairro")
    expect(
      await within(secao).findByRole("group", { name: "Mapa (double)" })
    ).toBeInTheDocument()
  })

  it("não mostra número de dado nas seções de texto (RF-00.20)", () => {
    render(<PaginaInicial />)

    const textos = [
      screen.getByRole("heading", { level: 1 }),
      screen.getByRole("region", { name: "Mapa dos bairros da sede" }),
    ].map((elemento) => elemento.textContent)
    expect(textos.join(" ")).not.toMatch(/\d/)
  })
})
