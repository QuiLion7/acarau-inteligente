import { expect, test as base } from "@playwright/test"

type OpcoesDeConsole = {
  // Exceção explícita e temporária por arquivo de spec; o padrão é nenhum erro de console.
  errosDeConsolePermitidos: RegExp[]
}

// Qualquer erro de console ou exceção da página falha o teste (RNF-00.06, test.md §13).
export const test = base.extend<OpcoesDeConsole>({
  errosDeConsolePermitidos: [[], { option: true }],
  page: async ({ page, errosDeConsolePermitidos }, usar) => {
    const erros: string[] = []
    page.on("console", (mensagem) => {
      if (mensagem.type() === "error") erros.push(mensagem.text())
    })
    page.on("pageerror", (erro) => erros.push(erro.message))

    await usar(page)

    const inesperados = erros.filter(
      (erro) => !errosDeConsolePermitidos.some((padrao) => padrao.test(erro))
    )
    expect(inesperados, "erros de console durante o teste").toEqual([])
  },
})

export { expect }
