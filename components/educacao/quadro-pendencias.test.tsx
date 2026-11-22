import { render, screen, within } from "@testing-library/react"

import { QuadroPendencias } from "@/components/educacao/quadro-pendencias"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

const { qualidade, escolas } = obterDadosTerritorio()

describe("QuadroPendencias (TU-26, CA-03.24)", () => {
  it("lista as 4 escolas sem localização e a escola fora do limite, 5 no total, com o INEP de cada uma", () => {
    render(<QuadroPendencias qualidade={qualidade} />)

    const quadro = screen.getByRole("region", {
      name: "Pendências de qualidade da base",
    })
    expect(within(quadro).getAllByRole("listitem")).toHaveLength(5)
    const semLocalizacao = escolas.filter(
      ({ estado }) => estado === "sem-localizacao"
    )
    expect(semLocalizacao).toHaveLength(4)
    for (const { nome, codigoInep } of [
      ...semLocalizacao,
      ...escolas.filter(({ estado }) => estado === "fora-do-limite"),
    ]) {
      expect(
        within(quadro).getByText(`${nome} (INEP ${codigoInep})`)
      ).toBeVisible()
    }
  })

  it("explica que não se inventa coordenada nem se geocodifica endereço, e cita a coordenada fora do limite", () => {
    render(<QuadroPendencias qualidade={qualidade} />)

    expect(
      screen.getByText(/não inventa coordenada nem geocodifica endereço/)
    ).toBeVisible()
    expect(
      screen.getByText(
        /Coordenada fora do limite municipal - possível inconsistência/
      )
    ).toBeVisible()
  })

  it("não repete os totais dos cards: um número só por conceito", () => {
    render(<QuadroPendencias qualidade={qualidade} />)

    expect(screen.queryByText("62")).toBeNull()
    expect(screen.queryByText("34")).toBeNull()
  })

  it("sem escola pendente não mostra lista nenhuma, só a explicação", () => {
    render(
      <QuadroPendencias
        qualidade={{ semLocalizacaoLista: [], foraDoLimiteLista: [] }}
      />
    )

    expect(screen.queryByRole("listitem")).toBeNull()
    expect(screen.getByText(/não inventa coordenada/)).toBeVisible()
  })
})
