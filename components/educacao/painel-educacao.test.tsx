import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { PainelEducacao } from "@/components/educacao/painel-educacao"
import type { IdCamadaControlavel } from "@/lib/territorio/estilo-mapa"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

const replace = jest.fn()
let consulta = ""

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/educacao",
  useSearchParams: () => new URLSearchParams(consulta),
}))
// O MapLibre não roda em jsdom: o double mostra o que o painel lhe entrega e deixa clicar num bairro e numa escola.
jest.mock("@/components/territorio/mapa-territorio-dinamico", () => ({
  MapaTerritorioDinamico: ({
    selecionadoId,
    camadasLigadas,
    escolas,
    onSelecionar,
    onAbrirEscola,
  }: {
    selecionadoId?: string | null
    camadasLigadas?: ReadonlySet<IdCamadaControlavel>
    escolas?: unknown[]
    onSelecionar: (id: string) => void
    onAbrirEscola?: (codigoInep: string) => void
  }) => (
    <div role="group" aria-label="Mapa (double)">
      <p>Destaque: {selecionadoId ?? "nenhum"}</p>
      <p>Camadas: {[...(camadasLigadas ?? [])].sort().join(",")}</p>
      <p>Escolas no mapa: {escolas?.length}</p>
      <button onClick={() => onSelecionar("uv-20")}>
        clicar em Morada no mapa
      </button>
      <button onClick={() => onAbrirEscola?.("23000910")}>
        clicar na escola fora do limite
      </button>
    </div>
  ),
}))

const { bairros, limite, escolas, qualidade, regraFronteira } =
  obterDadosTerritorio()
const FONTE = "Catálogo de escolas do INEP (CSV fornecido)"

function renderizar(parametros = "") {
  consulta = parametros
  return render(
    <PainelEducacao
      bairros={bairros}
      limite={limite}
      escolas={escolas}
      qualidade={qualidade}
      regraFronteira={regraFronteira}
      fonte={FONTE}
      dataReferencia="Não informada"
    />
  )
}

beforeEach(() => jest.clearAllMocks())

describe("PainelEducacao: Exportar relatório (CA-05.02)", () => {
  it("leva o bairro da URL ao relatório e não carrega parâmetros de outra tela", () => {
    renderizar("bairro=uv-10&periodo=2025&q=escola")

    expect(
      screen.getByRole("link", { name: "Exportar relatório" })
    ).toHaveAttribute("href", "/relatorios?bairro=uv-10&periodo=2025")
  })
})

describe("PainelEducacao: a base inteira (CA-03.16, CA-03.17)", () => {
  it("monta seletor, cinco cards, mapa com as três camadas fixas e legenda, tabela por bairro e lista", () => {
    renderizar()

    expect(screen.getByRole("combobox", { name: "Bairro" })).toHaveValue(
      "Todos os bairros"
    )
    expect(screen.getAllByRole("group", { name: /./ }).length).toBeGreaterThan(
      5
    )
    expect(
      screen.getByText("Camadas: bairros,escolas,limite-municipal")
    ).toBeVisible()
    expect(screen.getByText("Escolas no mapa: 62")).toBeVisible()
    expect(
      screen.getByText(
        "58 estabelecimentos escolares georreferenciados na base disponível."
      )
    ).toBeVisible()
    expect(
      screen.getByRole("heading", { name: "Escolas por bairro" })
    ).toBeVisible()
    expect(screen.getByText("Mostrando 1 a 10 de 62 escolas.")).toBeVisible()
    expect(
      screen.queryByRole("group", { name: "Escolas em Centro" })
    ).toBeNull()
  })

  it("não tem nenhum controle de camadas nem ação de escrita (TU-27, CA-03.15)", () => {
    renderizar()

    expect(screen.queryByRole("switch")).toBeNull()
    expect(screen.queryByRole("link", { name: /importar/i })).toBeNull()
    // Exportar CSV (EP-05, RF-05.18) só lê a tabela: não é escrita, então "exportar" saiu da lista; os outros verbos
    // de escrita continuam proibidos, e as únicas exportações são os dois CSV das tabelas.
    for (const botao of screen.getAllByRole("button")) {
      expect(botao).not.toHaveAccessibleName(
        /importar|publicar|despublicar|reiniciar|excluir|salvar|apagar/i
      )
    }
    expect(
      screen
        .getAllByRole("button", { name: /exportar/i })
        .map((botao) => botao.getAttribute("aria-label"))
    ).toEqual([
      "Exportar CSV: escolas por bairro",
      "Exportar CSV: lista de escolas",
    ])
  })
})

describe("PainelEducacao: bairro escolhido (TU-23, CA-03.19)", () => {
  it("com uv-10 o card do bairro diz 8, a lista tem 8 e o bairro está destacado no mapa e na tabela", () => {
    renderizar("bairro=uv-10")

    expect(
      within(
        screen.getByRole("group", { name: "Escolas em Centro" })
      ).getByText("8 escolas")
    ).toBeVisible()
    expect(screen.getByText("Mostrando 1 a 8 de 8 escolas.")).toBeVisible()
    expect(screen.getByText("Destaque: uv-10")).toBeVisible()
    expect(
      within(
        screen.getByRole("region", { name: "Escolas por bairro" })
      ).getByRole("row", { name: /Centro/ })
    ).toHaveAttribute("data-state", "selected")
    expect(screen.getByRole("combobox", { name: "Bairro" })).toHaveValue(
      "Centro (UV 10)"
    )
  })

  it("clicar num bairro no mapa escreve o bairro na URL e preserva o período (RN-03.10)", async () => {
    const usuario = userEvent.setup()
    renderizar("periodo=2025")

    await usuario.click(
      screen.getByRole("button", { name: "clicar em Morada no mapa" })
    )

    expect(replace).toHaveBeenCalledWith(
      "/educacao?periodo=2025&bairro=uv-20",
      { scroll: false }
    )
  })

  it("escolher pelo nome na tabela por bairro seleciona o mesmo bairro", async () => {
    const usuario = userEvent.setup()
    renderizar()
    const tabela = within(
      screen.getByRole("region", { name: "Escolas por bairro" })
    )

    await usuario.click(tabela.getByRole("button", { name: "Centro" }))

    expect(replace).toHaveBeenCalledWith("/educacao?bairro=uv-10", {
      scroll: false,
    })
  })
})

describe("PainelEducacao: bairro não reconhecido (CA-03.11)", () => {
  it("mostra o estado, não exibe o valor recebido e mantém cards, mapa e lista como 'todos'", async () => {
    const usuario = userEvent.setup()
    renderizar("bairro=uv-99")

    expect(
      screen.getByRole("heading", { name: "Bairro não reconhecido" })
    ).toBeVisible()
    expect(document.body).not.toHaveTextContent("uv-99")
    expect(screen.getByRole("combobox", { name: "Bairro" })).toHaveValue("")
    expect(
      screen.getByRole("group", { name: "Registros na base" })
    ).toBeVisible()
    expect(screen.getByText("Destaque: nenhum")).toBeVisible()
    expect(screen.getByText("Mostrando 1 a 10 de 62 escolas.")).toBeVisible()

    await usuario.click(screen.getByRole("button", { name: "Limpar bairro" }))

    expect(replace).toHaveBeenCalledWith("/educacao", { scroll: false })
  })
})

describe("PainelEducacao: ficha da escola num Sheet (DEC-T-07, RF-03.19)", () => {
  it("abre pelo mapa, mostra a ficha e fecha devolvendo a tela", async () => {
    const usuario = userEvent.setup()
    renderizar()
    expect(screen.queryByRole("dialog")).toBeNull()

    await usuario.click(
      screen.getByRole("button", { name: "clicar na escola fora do limite" })
    )

    const ficha = await screen.findByRole("dialog", { name: "Ficha da escola" })
    expect(within(ficha).getByText("23000910")).toBeVisible()
    expect(within(ficha).getByText("Fora do limite municipal")).toBeVisible()

    await usuario.click(within(ficha).getByRole("button", { name: "Fechar" }))

    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("abre pela lista, com o bairro da escola dentro de bairro", async () => {
    const usuario = userEvent.setup()
    renderizar("bairro=uv-10")
    const primeira = escolas.find(({ bairroId }) => bairroId === "uv-10")!

    await usuario.click(screen.getByRole("button", { name: primeira.nome }))

    const ficha = await screen.findByRole("dialog", { name: "Ficha da escola" })
    expect(
      within(ficha).getByRole("heading", { name: primeira.nome })
    ).toBeVisible()
    expect(within(ficha).getByText("Centro", { selector: "dd" })).toBeVisible()
  })
})

describe("PainelEducacao: busca, pendências e metodologia (CA-03.22, CA-03.24, CA-03.25)", () => {
  it("a lista tem busca: o código INEP 23000910 acha a escola fora do limite", async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.type(
      screen.getByRole("searchbox", { name: "Buscar escola" }),
      "23000910"
    )

    expect(screen.getByText("Mostrando 1 a 1 de 1 escola.")).toBeVisible()
  })

  it("lista as 5 escolas pendentes e deixa a metodologia recolhida", () => {
    renderizar()

    const quadro = screen.getByRole("region", {
      name: "Pendências de qualidade da base",
    })
    expect(within(quadro).getAllByRole("listitem")).toHaveLength(5)
    expect(
      screen.getByRole("button", { name: "Como os números são calculados" })
    ).toHaveAttribute("aria-expanded", "false")
  })
})

describe("PainelEducacao: ficha de escola sem localização (TU-25, CA-03.23, RN-03.09)", () => {
  it("abre pela lista com a etiqueta NAO_GEOREFERENCIADO, 'Sem localização' e nenhuma coordenada", async () => {
    const usuario = userEvent.setup()
    renderizar()
    const semLocalizacao = escolas.find(
      ({ estado }) => estado === "sem-localizacao"
    )!
    await usuario.type(
      screen.getByRole("searchbox", { name: "Buscar escola" }),
      semLocalizacao.codigoInep
    )

    await usuario.click(
      screen.getByRole("button", { name: semLocalizacao.nome })
    )

    const ficha = await screen.findByRole("dialog", { name: "Ficha da escola" })
    expect(within(ficha).getByText("NAO_GEOREFERENCIADO")).toBeVisible()
    expect(
      within(ficha).getByText("Sem localização", { selector: "dd" })
    ).toBeVisible()
    expect(
      within(ficha).getByText(/Escola sem coordenada na base/)
    ).toBeVisible()
    expect(ficha.textContent).not.toMatch(/-?\d{1,3}\.\d{4,}/)
    expect(semLocalizacao.posicao).toBeNull()
  })
})

describe("PainelEducacao: Baixar mapa (PNG) (RF-05.22, PA-05.10)", () => {
  it("oferece o botão, desabilitado enquanto o mapa não entrega a instância", () => {
    renderizar()

    expect(
      screen.getByRole("button", { name: "Baixar mapa (PNG)" })
    ).toBeDisabled()
  })
})
