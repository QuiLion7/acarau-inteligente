import { ADMINISTRADOR, ANALISTA, entrarPelaInterface } from "./acesso-helpers"
import { expect, test } from "./fixtures"

const NOME_DO_COOKIE = "acarau_sessao"

test.describe("acesso por papel", () => {
  test("o analista entra, vê nome e papel, abre a área do analista e não vê a administração", async ({
    page,
  }) => {
    await entrarPelaInterface(page, ANALISTA)

    await expect(page.getByRole("banner")).toContainText(
      "Analista Demo · Analista"
    )
    const menu = page.getByRole("navigation", { name: "Módulos" })
    await expect(menu.getByRole("link", { name: "Administração" })).toHaveCount(
      0
    )

    await menu.getByRole("link", { name: "Área do analista" }).click()
    await expect(
      page.getByRole("heading", { level: 1, name: "Área do analista" })
    ).toBeVisible()

    await page.goto("/admin")
    await expect(
      page.getByRole("heading", { level: 1, name: "Sem permissão" })
    ).toBeVisible()
    await expect(page.locator("#conteudo")).not.toContainText(
      "Você entrou como"
    )
  })

  test("o administrador entra e abre a área do analista e a administração", async ({
    page,
  }) => {
    await entrarPelaInterface(page, ADMINISTRADOR)

    await expect(page.getByRole("banner")).toContainText(
      "Administrador Demo · Administrador"
    )
    const menu = page.getByRole("navigation", { name: "Módulos" })

    await menu.getByRole("link", { name: "Área do analista" }).click()
    await expect(
      page.getByRole("heading", { level: 1, name: "Área do analista" })
    ).toBeVisible()

    await menu.getByRole("link", { name: "Administração" }).click()
    await expect(
      page.getByRole("heading", { level: 1, name: "Administração" })
    ).toBeVisible()
    await expect(page.locator("#conteudo")).toContainText(
      "Você entrou como Administrador Demo (Administrador)."
    )
  })
})

test.describe("operações nas áreas restritas (PA-02.02, PA-02.03)", () => {
  test("a área do analista leva a Importar CSV e a Datasets, e a administração oferece o reinício da demonstração", async ({
    page,
  }) => {
    await entrarPelaInterface(page, ADMINISTRADOR)

    await page.goto("/analista")
    await expect(
      page.getByRole("link", { name: "Importar CSV" })
    ).toHaveAttribute("href", "/saude/importar")
    await expect(page.getByRole("link", { name: "Datasets" })).toHaveAttribute(
      "href",
      "/saude/datasets"
    )

    await page.goto("/admin")
    await expect(
      page.getByRole("button", { name: "Reiniciar a demonstração" })
    ).toBeVisible()
  })

  test("o analista não vê o reinício: a administração lhe dá sem permissão", async ({
    page,
  }) => {
    await entrarPelaInterface(page, ANALISTA)

    await page.goto("/admin")

    await expect(
      page.getByRole("button", { name: "Reiniciar a demonstração" })
    ).toHaveCount(0)
  })
})

test.describe("retorno depois do login", () => {
  test("o visitante que abre /analista vai ao login com o aviso e volta à área depois de entrar", async ({
    page,
  }) => {
    await page.goto("/analista")

    await expect(page).toHaveURL(
      /\/entrar\?motivo=restrito&retorno=%2Fanalista$/
    )
    await expect(page.locator("#conteudo").getByRole("alert")).toContainText(
      "Entre para acessar esta área."
    )

    await page.getByLabel("Usuário").fill(ANALISTA.usuario)
    await page.getByLabel("Senha").fill(ANALISTA.senha)
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page).toHaveURL(/\/analista$/)
    await expect(
      page.getByRole("heading", { level: 1, name: "Área do analista" })
    ).toBeVisible()
  })

  test("um retorno para endereço externo volta ao início depois de entrar", async ({
    page,
  }) => {
    await page.goto("/entrar?retorno=https://exemplo.com")

    await page.getByLabel("Usuário").fill(ANALISTA.usuario)
    await page.getByLabel("Senha").fill(ANALISTA.senha)
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole("banner")).toContainText("Analista Demo")
  })

  test("quem já tem sessão e abre o login é levado ao retorno interno", async ({
    page,
  }) => {
    await entrarPelaInterface(page, ANALISTA)

    await page.goto("/entrar?retorno=/analista")

    await expect(page).toHaveURL(/\/analista$/)
  })
})

test.describe("sair", () => {
  test("avisa que a sessão foi encerrada e o cookie antigo deixa de valer", async ({
    page,
    request,
  }) => {
    await entrarPelaInterface(page, ANALISTA)
    const cookieAntigo = (await page.context().cookies()).find(
      (cookie) => cookie.name === NOME_DO_COOKIE
    )
    expect(cookieAntigo?.value).toBeTruthy()
    const comCookieAntigo = {
      headers: { cookie: `${NOME_DO_COOKIE}=${cookieAntigo?.value}` },
    }
    expect(
      (await request.get("/api/analista/status", comCookieAntigo)).status()
    ).toBe(200)

    await page.getByRole("button", { name: "Sair" }).click()

    await expect(page.getByText("Sessão encerrada.")).toBeVisible()
    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible()
    const reutilizado = await request.get(
      "/api/analista/status",
      comCookieAntigo
    )
    expect(reutilizado.status()).toBe(401)
    expect(await reutilizado.json()).toMatchObject({ code: "NAO_AUTENTICADO" })
  })
})

test.describe("cookie de sessão", () => {
  test("é HttpOnly e SameSite=Lax, e o script da página não o enxerga", async ({
    page,
  }) => {
    await entrarPelaInterface(page, ANALISTA)

    const cookie = (await page.context().cookies()).find(
      (candidato) => candidato.name === NOME_DO_COOKIE
    )

    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" })
    expect(cookie?.expires).toBe(-1)
    expect(await page.evaluate(() => document.cookie)).not.toContain(
      NOME_DO_COOKIE
    )
  })
})
