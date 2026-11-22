import AxeBuilder from "@axe-core/playwright"
import type { Page } from "@playwright/test"

// Painéis (Sheet/Dialog) abrem com animação: o axe lido no meio dela mede o contraste contra a sobreposição
// ainda translúcida e acusa uma violação que não existe no estado final. Esperar o fim das animações evita o falso positivo.
async function aguardarFimDasAnimacoes(page: Page): Promise<void> {
  await page.evaluate(() =>
    // Animação cancelada (elemento que sai da tela) rejeita `finished`; para esta espera, cancelada também é terminada.
    Promise.allSettled(
      document.getAnimations().map((animacao) => animacao.finished)
    )
  )
}

export async function violacoesGraves(page: Page) {
  await aguardarFimDasAnimacoes(page)
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations.filter(
    ({ impact }) => impact === "serious" || impact === "critical"
  )
}
