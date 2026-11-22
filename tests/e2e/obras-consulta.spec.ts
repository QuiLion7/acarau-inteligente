import type { Page } from "@playwright/test"

import { reiniciarDemo } from "./acesso-helpers"
import { inserirObras } from "./banco-e2e"
import { expect, test } from "./fixtures"
import {
  aguardarMapaPronto,
  clicarNoPonto,
  obraDestacadaNoMapa,
  obrasNoMapa,
  pontoInteriorDe,
} from "./mapa-helpers"

// Por atributo, não por papel: com a ficha aberta (modal) o resto da página fica `aria-hidden` e some da árvore de
// acessibilidade, mas o mapa e a lista continuam lá para conferir o destaque.
const mapaDeObras = (page: Page) =>
  page.locator(
    '[role="region"][aria-label="Mapa das obras por bairro de Acaraú"]'
  )
const linhaDaObra = (page: Page, titulo: string) =>
  page.locator("tr", {
    has: page.locator("button", { hasText: titulo }),
  })
const cartao = (page: Page, nome: string) =>
  page.getByRole("group", { name: nome, exact: true })
const listaDeObras = (page: Page) =>
  page.getByRole("region", { name: "Lista de obras" })
const linhasDaLista = (page: Page) =>
  listaDeObras(page)
    .getByRole("row")
    .filter({ has: page.getByRole("button") })

async function valoresDoResumo(page: Page) {
  const nomes = [
    "Total de obras",
    "Planejada",
    "Em andamento",
    "Concluída",
    "Suspensa",
    "Sem localização",
  ]
  const valores: Record<string, string> = {}
  for (const nome of nomes) {
    valores[nome] = (await cartao(page, nome).locator("p").textContent()) ?? ""
  }
  return valores
}

test.beforeEach(async () => {
  await reiniciarDemo()
})

test.describe("Obras: visitante sem sessão (E2E-01)", () => {
  test("vê a faixa sintética, o resumo, 7 marcadores para 8 obras, a lista e nenhum controle de escrita", async ({
    page,
  }) => {
    await page.goto("/obras")

    await expect(
      page.getByRole("heading", { level: 1, name: "Obras" })
    ).toBeVisible()
    await expect(
      page.getByText(/obras fictícias criadas para a demonstração/)
    ).toBeVisible()
    expect(await valoresDoResumo(page)).toEqual({
      "Total de obras": "8",
      Planejada: "3",
      "Em andamento": "3",
      Concluída: "1",
      Suspensa: "1",
      "Sem localização": "1",
    })
    await expect(linhasDaLista(page)).toHaveCount(8)
    await expect(listaDeObras(page).getByText("SINTETICO")).toHaveCount(8)
    await expect(
      listaDeObras(page).getByRole("cell", { name: "Sem localização" })
    ).toHaveCount(1)
    await aguardarMapaPronto(mapaDeObras(page))
    expect(await obrasNoMapa(mapaDeObras(page))).toHaveLength(7)
    await expect(
      page.locator("#conteudo").getByRole("button", {
        name: /nova obra|editar|excluir|apagar|salvar/i,
      })
    ).toHaveCount(0)
    await expect(
      page.locator("#conteudo").getByRole("link", { name: /nova obra/i })
    ).toHaveCount(0)
  })

  test("filtra por duas situações e por bairro, e o recorte sobrevive ao recarregar", async ({
    page,
  }) => {
    await page.goto("/obras")
    await aguardarMapaPronto(mapaDeObras(page))

    await page.getByRole("button", { name: "Em andamento" }).click()
    await page.getByRole("button", { name: "Suspensa" }).click()
    await expect(page).toHaveURL(/situacao=em_andamento%2Csuspensa/)
    await expect(linhasDaLista(page)).toHaveCount(4)
    expect(await obrasNoMapa(mapaDeObras(page))).toHaveLength(4)

    await page.getByRole("combobox", { name: "Bairro" }).click()
    await page.getByRole("option", { name: "Paulo VI (UV 6)" }).click()
    await expect(page).toHaveURL(/bairro=uv-06/)
    await expect(linhasDaLista(page)).toHaveCount(1)
    await expect(
      listaDeObras(page).getByRole("button", {
        name: "DEMO - Reforma de edificação pública",
      })
    ).toBeVisible()
    expect(await valoresDoResumo(page)).toMatchObject({
      "Total de obras": "1",
      Planejada: "0",
      "Em andamento": "0",
      Suspensa: "1",
    })

    await page.reload()
    await aguardarMapaPronto(mapaDeObras(page))

    await expect(
      page.getByRole("button", { name: "Suspensa" })
    ).toHaveAttribute("aria-pressed", "true")
    await expect(linhasDaLista(page)).toHaveCount(1)
    expect(await obrasNoMapa(mapaDeObras(page))).toHaveLength(1)
  })

  test("filtro sem obra mostra a mensagem e o resumo zerado, e limpar traz tudo de volta", async ({
    page,
  }) => {
    await page.goto("/obras?situacao=concluida&bairro=uv-10")

    await expect(
      page.getByRole("heading", { name: "Nenhuma obra com estes filtros" })
    ).toBeVisible()
    expect(await valoresDoResumo(page)).toEqual({
      "Total de obras": "0",
      Planejada: "0",
      "Em andamento": "0",
      Concluída: "0",
      Suspensa: "0",
      "Sem localização": "0",
    })

    await page.getByRole("button", { name: "Limpar filtros" }).click()

    await expect(page).toHaveURL(/\/obras$/)
    await expect(linhasDaLista(page)).toHaveCount(8)
  })

  test("bairro inválido na URL mostra o aviso e todas as obras, sem repetir o valor", async ({
    page,
  }) => {
    await page.goto("/obras?bairro=xx-valor-invalido")

    await expect(
      page.getByRole("heading", { name: "Bairro não reconhecido" })
    ).toBeVisible()
    await expect(linhasDaLista(page)).toHaveCount(8)
    await expect(page.locator("#conteudo")).not.toContainText("valor-invalido")
  })

  test("abre a ficha pela lista e pelo marcador, com o destaque no mapa e na lista, e o foco volta à linha", async ({
    page,
  }) => {
    await page.goto("/obras")
    const mapa = mapaDeObras(page)
    await aguardarMapaPronto(mapa)
    const botaoDaPraca = listaDeObras(page).getByRole("button", {
      name: "DEMO - Requalificação de praça",
    })

    await botaoDaPraca.click()

    const ficha = page.getByRole("dialog", { name: "Ficha da obra" })
    await expect(ficha).toBeVisible()
    await expect(
      ficha.getByRole("heading", { name: "DEMO - Requalificação de praça" })
    ).toBeVisible()
    await expect(ficha).toContainText("SINTETICO")
    await expect(ficha).toContainText("Centro")
    await expect(ficha).toContainText("Valor previsto - não é valor pago")
    await expect(ficha).toContainText("Obra criada como Planejada")
    await expect(
      ficha.getByRole("button", { name: /excluir|apagar/i })
    ).toHaveCount(0)
    const praca = (await obrasNoMapa(mapa)).find(
      ({ titulo }) => titulo === "DEMO - Requalificação de praça"
    )!
    expect(await obraDestacadaNoMapa(mapa)).toBe(praca.id)
    await expect(
      linhaDaObra(page, "DEMO - Requalificação de praça")
    ).toHaveAttribute("aria-current", "true")

    await page.keyboard.press("Escape")
    await expect(ficha).toBeHidden()
    await expect(botaoDaPraca).toBeFocused()

    await clicarNoPonto(mapa, pontoInteriorDe("uv-03"))

    await expect(ficha).toBeVisible()
    await expect(
      ficha.getByRole("heading", { name: "DEMO - Pavimentação de via" })
    ).toBeVisible()
    await expect(ficha).toContainText("São Benedito")
    await expect(
      linhaDaObra(page, "DEMO - Pavimentação de via")
    ).toHaveAttribute("aria-current", "true")
    // O clique no marcador abre a obra e não filtra por bairro.
    await expect(page).toHaveURL(/\/obras$/)
  })
})

test.describe("Obras: volume (E2E-06, RNF-04.05)", () => {
  test("200 obras: a lista e o mapa carregam sem erro, com um marcador por obra", async ({
    page,
  }) => {
    await inserirObras(200)

    await page.goto("/obras")

    await expect(linhasDaLista(page)).toHaveCount(200)
    await expect(page.getByText("Mostrando 200 obras.")).toBeVisible()
    await aguardarMapaPronto(mapaDeObras(page))
    expect(await obrasNoMapa(mapaDeObras(page))).toHaveLength(200)
    expect((await valoresDoResumo(page))["Total de obras"]).toBe("200")
  })
})
