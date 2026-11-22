import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { MetodologiaSaude } from "@/components/saude/metodologia-saude"
import { TEXTOS_SAUDE } from "@/lib/config/textos-saude"
import { ANALISE_SAUDE } from "@/test/saude-fixtures"

const gatilho = () =>
  screen.getByRole("button", { name: "Como os números são calculados" })

describe("MetodologiaSaude (TU-16, CA-03.13)", () => {
  it("abre recolhida: só o título aparece, sem nenhuma regra", () => {
    render(<MetodologiaSaude analise={ANALISE_SAUDE} />)

    expect(gatilho()).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText(TEXTOS_SAUDE.taxa)).toBeNull()
  })

  it("aberta, mostra nome, fonte, versão, granularidade, unidade e períodos do dataset em tela", async () => {
    const usuario = userEvent.setup()
    render(<MetodologiaSaude analise={ANALISE_SAUDE} />)

    await usuario.click(gatilho())

    const dados = screen.getByText("Dataset").closest("dl")
    const dataset = within(dados as HTMLElement)
    expect(dataset.getByText("Roteiro 2025-2026")).toBeVisible()
    expect(dataset.getByText("Planilha de roteiro")).toBeVisible()
    expect(dataset.getByText("1")).toBeVisible()
    expect(dataset.getByText("anual")).toBeVisible()
    expect(dataset.getByText("casos")).toBeVisible()
    expect(dataset.getByText("2025, 2026")).toBeVisible()
  })

  it("dataset mensal diz a granularidade 'mensal'", async () => {
    const usuario = userEvent.setup()
    render(
      <MetodologiaSaude
        analise={{
          ...ANALISE_SAUDE,
          versao: { ...ANALISE_SAUDE.versao, granularidade: "mes" },
        }}
      />
    )

    await usuario.click(gatilho())

    expect(screen.getByText("mensal")).toBeVisible()
  })

  it("aberta, lista as regras de RF-03.11: registro agregado, total, zero e sem dados, classes, ranking, variação, taxa e dado sintético", async () => {
    const usuario = userEvent.setup()
    render(<MetodologiaSaude analise={ANALISE_SAUDE} />)

    await usuario.click(gatilho())

    const regras = within(screen.getByRole("list"))
    for (const texto of [
      TEXTOS_SAUDE.metodologia.registro,
      TEXTOS_SAUDE.metodologia.total,
      TEXTOS_SAUDE.metodologia.zeroSemDados,
      TEXTOS_SAUDE.metodologia.classes,
      TEXTOS_SAUDE.classeUnica,
      TEXTOS_SAUDE.regraRanking,
      TEXTOS_SAUDE.metodologia.variacao,
      TEXTOS_SAUDE.taxa,
      TEXTOS_SAUDE.metodologia.sintetico,
    ]) {
      expect(regras.getByText(texto)).toBeVisible()
    }
  })
})
