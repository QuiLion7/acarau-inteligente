import { render, screen, within } from "@testing-library/react"

import { ListaCamadas } from "@/app/fontes/components/lista-camadas"
import type { CamadaCarregada } from "@/lib/config/camadas-carregadas"

const CAMADA_A: CamadaCarregada = {
  id: "a",
  nome: "Camada A",
  fonte: "Órgão A",
  etiqueta: "OFICIAL_FONTE",
  versao: "v1",
  dataReferencia: "Não informada",
  cobertura: "Toda a sede",
  limitacoes: ["Limitação 1", "Limitação 2"],
}
const CAMADA_B: CamadaCarregada = {
  ...CAMADA_A,
  id: "b",
  nome: "Camada B",
  fonte: "Órgão B",
  versao: "v2",
  dataReferencia: "01/01/2026",
  limitacoes: ["Só uma"],
}

describe("ListaCamadas", () => {
  it("mostra um cartão por camada com fonte, etiqueta, versão, data, cobertura e limitações", () => {
    render(<ListaCamadas camadas={[CAMADA_A, CAMADA_B]} />)

    const cartaoA = screen.getByRole("article", { name: "Camada A" })

    expect(screen.getAllByRole("article")).toHaveLength(2)
    expect(cartaoA).toHaveTextContent("Fonte:Órgão A")
    expect(cartaoA).toHaveTextContent("Etiqueta:OFICIAL_FONTE")
    expect(cartaoA).toHaveTextContent("Versão:v1")
    expect(cartaoA).toHaveTextContent("Data de referência:Não informada")
    expect(cartaoA).toHaveTextContent("Cobertura:Toda a sede")
    expect(
      within(cartaoA)
        .getAllByRole("listitem")
        .map((item) => item.textContent)
    ).toEqual(["Limitação 1", "Limitação 2"])
  })

  it("mostra a data de referência informada de cada camada no próprio cartão", () => {
    render(<ListaCamadas camadas={[CAMADA_A, CAMADA_B]} />)

    const cartaoB = screen.getByRole("article", { name: "Camada B" })

    expect(cartaoB).toHaveTextContent("Data de referência:01/01/2026")
    expect(cartaoB).toHaveTextContent("Versão:v2")
    expect(within(cartaoB).getAllByRole("listitem")).toHaveLength(1)
  })
})
