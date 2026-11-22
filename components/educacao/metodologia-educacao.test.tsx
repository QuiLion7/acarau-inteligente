import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { MetodologiaEducacao } from "@/components/educacao/metodologia-educacao"
import { TEXTOS_EDUCACAO } from "@/lib/config/textos-educacao"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

const { regraFronteira } = obterDadosTerritorio()
const FONTE = "Catálogo de escolas do INEP (CSV fornecido)"
const gatilho = () =>
  screen.getByRole("button", { name: "Como os números são calculados" })

describe("MetodologiaEducacao (TU-26, CA-03.25)", () => {
  it("abre recolhida: só o título aparece, sem nenhuma regra", () => {
    render(
      <MetodologiaEducacao
        regraFronteira={regraFronteira}
        fonte={FONTE}
        dataReferencia="Não informada"
      />
    )

    expect(gatilho()).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText(regraFronteira)).toBeNull()
  })

  it("aberta, lê a regra de contagem, a de fronteira, fora da cobertura, fora do limite, sem localização e o aviso de não completude", async () => {
    const usuario = userEvent.setup()
    render(
      <MetodologiaEducacao
        regraFronteira={regraFronteira}
        fonte={FONTE}
        dataReferencia="Não informada"
      />
    )

    await usuario.click(gatilho())

    const regras = within(screen.getByRole("list"))
    const { metodologia } = TEXTOS_EDUCACAO
    for (const texto of [
      metodologia.contagem,
      regraFronteira,
      metodologia.foraDaCobertura,
      metodologia.foraDoLimite,
      metodologia.semLocalizacao,
      metodologia.zero,
      metodologia.limites,
    ]) {
      expect(regras.getByText(texto)).toBeVisible()
    }
  })

  it("aberta, mostra a fonte e a data de referência recebidas", async () => {
    const usuario = userEvent.setup()
    render(
      <MetodologiaEducacao
        regraFronteira={regraFronteira}
        fonte={FONTE}
        dataReferencia="Não informada"
      />
    )

    await usuario.click(gatilho())

    expect(screen.getByText("Fonte").nextElementSibling).toHaveTextContent(
      FONTE
    )
    expect(
      screen.getByText("Data de referência").nextElementSibling
    ).toHaveTextContent("Não informada")
  })

  it("nenhum texto afirma completude nem funcionamento atual da base (RN-03.08)", async () => {
    const usuario = userEvent.setup()
    render(
      <MetodologiaEducacao
        regraFronteira={regraFronteira}
        fonte={FONTE}
        dataReferencia="Não informada"
      />
    )
    await usuario.click(gatilho())

    const texto = screen.getByRole("list").textContent ?? ""

    expect(texto).toContain("não é um censo completo")
    expect(texto).toContain("não garante que cada escola funcione hoje")
    expect(texto).not.toMatch(/[—–]/)
  })
})
