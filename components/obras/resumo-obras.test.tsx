import { render, screen, within } from "@testing-library/react"

import { ResumoObras } from "@/components/obras/resumo-obras"

function cartao(nome: string) {
  return screen.getByRole("group", { name: nome })
}

describe("ResumoObras (RF-04.09, RN-04.12)", () => {
  it("mostra o total, cada situação e as obras sem localização", () => {
    render(
      <ResumoObras
        resumo={{
          total: 8,
          porSituacao: {
            planejada: 3,
            em_andamento: 3,
            concluida: 1,
            suspensa: 1,
          },
          semLocalizacao: 1,
        }}
      />
    )

    expect(within(cartao("Total de obras")).getByText("8")).toBeVisible()
    expect(within(cartao("Planejada")).getByText("3")).toBeVisible()
    expect(within(cartao("Em andamento")).getByText("3")).toBeVisible()
    expect(within(cartao("Concluída")).getByText("1")).toBeVisible()
    expect(within(cartao("Suspensa")).getByText("1")).toBeVisible()
    expect(within(cartao("Sem localização")).getByText("1")).toBeVisible()
  })

  it("mostra 0 em cada situação quando o filtro não tem obra, porque é contagem de cadastro", () => {
    render(
      <ResumoObras
        resumo={{
          total: 0,
          porSituacao: {
            planejada: 0,
            em_andamento: 0,
            concluida: 0,
            suspensa: 0,
          },
          semLocalizacao: 0,
        }}
      />
    )

    for (const nome of [
      "Total de obras",
      "Planejada",
      "Em andamento",
      "Concluída",
      "Suspensa",
      "Sem localização",
    ]) {
      expect(within(cartao(nome)).getByText("0")).toBeVisible()
    }
  })
})
