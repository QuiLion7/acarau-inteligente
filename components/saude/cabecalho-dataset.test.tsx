import { render, screen, within } from "@testing-library/react"

import { CabecalhoDataset } from "@/components/saude/cabecalho-dataset"
import { ANALISE_SAUDE } from "@/test/saude-fixtures"

const { dataset, versao } = ANALISE_SAUDE

describe("CabecalhoDataset (RF-02.29, CA-02.28)", () => {
  it("mostra a faixa de dados sintéticos, o nome, a etiqueta SINTETICO, o indicador, a fonte, a versão e a data", () => {
    render(<CabecalhoDataset dataset={dataset} versao={versao} />)

    expect(screen.getByRole("note")).toHaveTextContent(
      "Dados sintéticos: números fictícios criados para a demonstração."
    )
    expect(
      screen.getByRole("heading", { level: 2, name: "Roteiro 2025-2026" })
    ).toBeVisible()
    expect(screen.getByText("SINTETICO")).toBeVisible()
    const detalhes = within(
      screen.getByText("Indicador").closest("dl") as HTMLElement
    )
    expect(detalhes.getByText("Casos notificados (sintético)")).toBeVisible()
    expect(detalhes.getByText("Planilha de roteiro")).toBeVisible()
    expect(detalhes.getByText("Versão").nextElementSibling).toHaveTextContent(
      "1"
    )
    expect(detalhes.getByText("20/11/2026, 11:02")).toBeVisible()
  })

  it("versão publicada não leva o aviso de privado", () => {
    render(<CabecalhoDataset dataset={dataset} versao={versao} />)

    expect(screen.queryByText(/não visível ao visitante/)).toBeNull()
  })

  it("versão privada diz que não é visível ao visitante", () => {
    render(
      <CabecalhoDataset
        dataset={dataset}
        versao={{ ...versao, situacao: "privado", publicadoEm: null }}
      />
    )

    expect(screen.getByText("Privado: não visível ao visitante.")).toBeVisible()
  })
})
