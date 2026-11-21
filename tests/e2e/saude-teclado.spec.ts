import { ANALISTA, entrarPelaApi, reiniciarDemo } from "./acesso-helpers"
import { expect, test } from "./fixtures"
import { bytesSinteticos, enviarArquivo } from "./saude-helpers"
import { focoAtual, tabAte } from "./teclado-helpers"

test.describe("Saúde só com o teclado (E2E-07)", () => {
  test.beforeEach(async () => {
    await reiniciarDemo()
  })

  test("o analista percorre o assistente do envio à confirmação sem mouse, com foco visível", async ({
    page,
  }) => {
    await entrarPelaApi(page, ANALISTA)
    await page.goto("/saude/importar")
    await expect(
      page.getByRole("heading", { name: "Enviar arquivo" })
    ).toBeVisible()

    // O diálogo de arquivos do sistema não é do teclado da página: o foco chega ao campo e o arquivo entra por ele.
    const noCampo = await tabAte(page, "Arquivo CSV")
    expect(noCampo.at(-1)?.focoVisivel).toBe(true)
    await enviarArquivo(
      page,
      "saude-roteiro_DEMO.csv",
      bytesSinteticos("saude-roteiro_DEMO.csv")
    )
    await expect(
      page.getByRole("heading", { name: "Colunas do arquivo" })
    ).toBeFocused()

    const aoContinuar = await tabAte(page, "Continuar")
    expect(aoContinuar.at(-1)?.focoVisivel).toBe(true)
    await page.keyboard.press("Enter")
    await expect(page.getByRole("heading", { name: "Bairros" })).toBeFocused()

    for (const [campo, opcao] of [
      ["Bairro para o nome Morada", "Morada dos Ventos (UV 20)"],
      ["Bairro para o nome Aranaú", "Fora da cobertura"],
    ]) {
      await page.getByRole("combobox", { name: campo }).focus()
      await page.keyboard.press("Enter")
      await page.getByRole("option", { name: opcao }).focus()
      await page.keyboard.press("Enter")
      await expect(page.getByRole("combobox", { name: campo })).toContainText(
        opcao
      )
    }

    await tabAte(page, "Continuar")
    await page.keyboard.press("Enter")
    await expect(page.getByRole("heading", { name: "Validação" })).toBeFocused()
    await tabAte(page, "Continuar")
    await page.keyboard.press("Enter")
    await expect(
      page.getByRole("heading", { name: "Confirmar importação" })
    ).toBeFocused()

    await tabAte(page, "Nome do dataset")
    await page.keyboard.type("Roteiro pelo teclado")
    await page.keyboard.press("Tab")
    await page.keyboard.type("Casos notificados (sintético)")
    await page.keyboard.press("Tab")
    await page.keyboard.type("Planilha de roteiro")
    const aoConfirmar = await tabAte(page, "Confirmar importação")
    expect(aoConfirmar.at(-1)?.focoVisivel).toBe(true)
    await page.keyboard.press("Enter")

    await expect(page).toHaveURL(/\/saude\?versao=[0-9a-f-]{36}$/)
  })

  test("o visitante escolhe o período, o bairro e ordena a tabela sem mouse, com foco visível", async ({
    page,
  }) => {
    await page.goto("/saude")
    await expect(
      page.getByRole("region", { name: "Total do período" })
    ).toBeVisible()

    // O gatilho do select mostra o valor e a seta de abrir juntos.
    const noPeriodo = await tabAte(page, "2026▼")
    expect(noPeriodo.at(-1)?.focoVisivel).toBe(true)
    await page.keyboard.press("Enter")
    await page.getByRole("option", { name: "2025" }).focus()
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/periodo=2025/)

    const noRanking = await tabAte(page, "Centro")
    expect(noRanking.at(-1)?.focoVisivel).toBe(true)
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/bairro=uv-10/)
    await expect(
      page
        .getByRole("region", { name: "Casos por bairro" })
        .getByRole("row", { name: /Centro/ })
    ).toHaveAttribute("data-state", "selected")

    const noCabecalho = await tabAte(page, "Casos")
    expect(noCabecalho.at(-1)?.focoVisivel).toBe(true)
    await page.keyboard.press("Enter")
    await expect(
      page.getByRole("columnheader", { name: "Casos" })
    ).toHaveAttribute("aria-sort", /ascending|descending/)
  })

  test("no Território, escolher um bairro pela busca leva o foco ao título da ficha", async ({
    page,
  }) => {
    await page.goto("/territorio")
    await expect(
      page.getByRole("navigation", { name: "Módulos" })
    ).toBeVisible()

    await tabAte(page, "Buscar bairro")
    await page.keyboard.type("sao benedito")
    await page.keyboard.press("Tab")
    expect((await focoAtual(page)).nome).toContain("São Benedito")
    await page.keyboard.press("Enter")

    await expect(
      page.getByRole("article").getByRole("heading", { name: "São Benedito" })
    ).toBeFocused()
  })
})
