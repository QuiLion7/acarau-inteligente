import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { PainelObras } from "@/components/obras/painel-obras"
import { montarObra } from "@/lib/obras/__fixtures__/obra"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"
import type { ObraNoMapa } from "@/lib/territorio/geojson-mapa"

const replace = jest.fn()
let consulta = ""

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/obras",
  useSearchParams: () => new URLSearchParams(consulta),
}))
// O MapLibre não roda em jsdom: o double mostra o que o painel lhe entrega e deixa clicar num bairro e num marcador.
jest.mock("@/components/territorio/mapa-territorio-dinamico", () => ({
  MapaTerritorioDinamico: ({
    obras,
    obraSelecionadaId,
    selecionadoId,
    onSelecionar,
    onAbrirObra,
    pontoProvisorio,
    onEscolherPonto,
  }: {
    obras?: ObraNoMapa[]
    obraSelecionadaId?: string | null
    selecionadoId?: string | null
    onSelecionar: (id: string) => void
    onAbrirObra?: (id: string) => void
    pontoProvisorio?: { longitude: number; latitude: number } | null
    onEscolherPonto?: (ponto: { longitude: number; latitude: number }) => void
  }) => (
    <div role="group" aria-label="Mapa (double)">
      <p>
        Ponto provisório:{" "}
        {pontoProvisorio
          ? `${pontoProvisorio.longitude};${pontoProvisorio.latitude}`
          : "nenhum"}
      </p>
      <p>Escolhendo ponto: {onEscolherPonto ? "sim" : "não"}</p>
      <button
        onClick={() => onEscolherPonto?.({ longitude: -40.1, latitude: -2.9 })}
      >
        clicar num ponto livre do mapa
      </button>
      <p>Marcadores: {obras?.length}</p>
      <p>Obra destacada: {obraSelecionadaId ?? "nenhuma"}</p>
      <p>Bairro destacado: {selecionadoId ?? "nenhum"}</p>
      <button onClick={() => onSelecionar("uv-03")}>
        clicar em São Benedito
      </button>
      {obras?.map(({ id, titulo }) => (
        <button key={id} onClick={() => onAbrirObra?.(id)}>
          marcador {titulo}
        </button>
      ))}
    </div>
  ),
}))

const mockDefinirPonto = jest.fn()
// O formulário tem teste próprio: aqui só importa o que o painel lhe entrega e como reage ao que ele devolve.
jest.mock("@/components/obras/form-obra", () => {
  const { useImperativeHandle } = jest.requireActual("react")
  return {
    FormObra: ({
      ref,
      obra,
      onSalvo,
      onCancelar,
      onPontoProvisorioChange,
    }: {
      ref: unknown
      obra: { id: string; titulo: string } | null
      onSalvo: (obra: unknown) => void
      onCancelar: () => void
      onPontoProvisorioChange: (ponto: unknown) => void
    }) => {
      useImperativeHandle(ref, () => ({ definirPonto: mockDefinirPonto }))
      return (
        <form aria-label="Formulário (double)">
          <p>Editando: {obra ? obra.titulo : "nova obra"}</p>
          <button
            type="button"
            onClick={() =>
              onPontoProvisorioChange({ longitude: -40.2, latitude: -2.8 })
            }
          >
            digitar coordenadas
          </button>
          <button
            type="button"
            onClick={() => onSalvo(obra ?? { id: "obra-nova" })}
          >
            salvar (double)
          </button>
          <button type="button" onClick={onCancelar}>
            cancelar (double)
          </button>
        </form>
      )
    },
  }
})

const { bairros, limite, regraFronteira } = obterDadosTerritorio()

const OBRAS = [
  montarObra({
    id: "obra-centro",
    titulo: "DEMO - Praça no Centro",
    situacao: "planejada",
    estadoLocalizacao: "dentro-de-bairro",
    bairroId: "uv-10",
    localizacao: { longitude: -40.118958, latitude: -2.885116 },
    atualizadoEm: "2026-11-03T10:00:00.000Z",
  }),
  montarObra({
    id: "obra-benedito",
    titulo: "DEMO - Via em São Benedito",
    situacao: "em_andamento",
    estadoLocalizacao: "dentro-de-bairro",
    bairroId: "uv-03",
    localizacao: { longitude: -40.11933, latitude: -2.878113 },
    atualizadoEm: "2026-11-04T10:00:00.000Z",
  }),
  montarObra({
    id: "obra-suspensa",
    titulo: "DEMO - Obra suspensa em São Benedito",
    situacao: "suspensa",
    estadoLocalizacao: "dentro-de-bairro",
    bairroId: "uv-03",
    localizacao: { longitude: -40.1195, latitude: -2.8785 },
    atualizadoEm: "2026-11-05T10:00:00.000Z",
  }),
  montarObra({
    id: "obra-sem-ponto",
    titulo: "DEMO - Área de lazer",
    situacao: "planejada",
    atualizadoEm: "2026-11-06T10:00:00.000Z",
  }),
]

type OpcoesDoPainel = {
  podeEditar?: boolean
  abrirNova?: boolean
  obraInicialId?: string | null
}

function renderizar(
  parametros = "",
  obras = OBRAS,
  {
    podeEditar = false,
    abrirNova = false,
    obraInicialId = null,
  }: OpcoesDoPainel = {}
) {
  consulta = parametros
  return render(
    <PainelObras
      obras={obras}
      bairros={bairros}
      limite={limite}
      regraFronteira={regraFronteira}
      podeEditar={podeEditar}
      abrirNova={abrirNova}
      obraInicialId={obraInicialId}
    />
  )
}

function cartao(nome: string) {
  return screen.getByRole("group", { name: nome })
}

beforeEach(() => {
  jest.clearAllMocks()
  Element.prototype.scrollIntoView = jest.fn()
})

describe("PainelObras: Exportar relatório (CA-05.02, PA-05.10)", () => {
  it("o visitante tem o link, com o bairro da URL e sem a situação, que é local de Obras", () => {
    renderizar("bairro=uv-03&situacao=suspensa")

    expect(
      screen.getByRole("link", { name: "Exportar relatório" })
    ).toHaveAttribute("href", "/relatorios?bairro=uv-03")
  })

  it("o analista vê o link ao lado de Nova obra", () => {
    renderizar("", OBRAS, { podeEditar: true })

    expect(
      screen.getByRole("link", { name: "Exportar relatório" })
    ).toBeVisible()
    expect(screen.getByRole("button", { name: "Nova obra" })).toBeVisible()
  })
})

describe("PainelObras: obra inicial vinda da auditoria (RF-05.28)", () => {
  it("abre a ficha da obra pedida e destaca o marcador dela", () => {
    renderizar("", OBRAS, { obraInicialId: "obra-benedito" })

    expect(screen.getByRole("dialog", { name: /ficha da obra/i })).toBeVisible()
    expect(screen.getByText("Obra destacada: obra-benedito")).toBeVisible()
    expect(
      within(screen.getByRole("dialog")).getByText("DEMO - Via em São Benedito")
    ).toBeVisible()
  })

  it("sem obra inicial a ficha começa fechada", () => {
    renderizar()

    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByText("Obra destacada: nenhuma")).toBeVisible()
  })
})

describe("PainelObras: visitante sem filtro (CA-04.01, CA-04.02, TU-12)", () => {
  it("mostra a faixa sintética, o resumo, o mapa com marcadores só das obras com ponto e a lista inteira", () => {
    renderizar()

    expect(
      screen.getByText(/obras fictícias criadas para a demonstração/)
    ).toBeVisible()
    expect(within(cartao("Total de obras")).getByText("4")).toBeVisible()
    expect(within(cartao("Sem localização")).getByText("1")).toBeVisible()
    expect(screen.getByText("Marcadores: 3")).toBeVisible()
    expect(screen.getByText("Mostrando 4 obras.")).toBeVisible()
    expect(screen.getAllByText("SINTETICO")).toHaveLength(4)
  })

  it("não oferece nenhum controle de escrita: sem Nova obra, sem Editar, sem excluir", () => {
    renderizar()

    for (const botao of screen.getAllByRole("button")) {
      expect(botao).not.toHaveAccessibleName(
        /nova obra|editar|excluir|apagar|salvar/i
      )
    }
    expect(screen.queryByRole("link", { name: /nova obra/i })).toBeNull()
  })

  it("ordena a lista pela última atualização, da mais recente para a mais antiga", () => {
    renderizar()

    const titulos = screen
      .getAllByRole("button", { name: /^DEMO - / })
      .filter((botao) => botao.id.startsWith("botao-obra-"))
      .map((botao) => botao.textContent)
    expect(titulos).toEqual([
      "DEMO - Área de lazer",
      "DEMO - Obra suspensa em São Benedito",
      "DEMO - Via em São Benedito",
      "DEMO - Praça no Centro",
    ])
  })
})

describe("PainelObras: filtros (CA-04.14, CA-04.15, RF-04.07)", () => {
  it("situação e bairro da URL valem juntos para resumo, mapa e lista", () => {
    renderizar("situacao=em_andamento,suspensa&bairro=uv-03")

    expect(within(cartao("Total de obras")).getByText("2")).toBeVisible()
    expect(within(cartao("Planejada")).getByText("0")).toBeVisible()
    expect(within(cartao("Em andamento")).getByText("1")).toBeVisible()
    expect(within(cartao("Suspensa")).getByText("1")).toBeVisible()
    expect(screen.getByText("Marcadores: 2")).toBeVisible()
    expect(screen.getByText("Mostrando 2 obras.")).toBeVisible()
    expect(
      screen.queryByRole("button", { name: "DEMO - Praça no Centro" })
    ).toBeNull()
    expect(screen.getByText("Bairro destacado: uv-03")).toBeVisible()
  })

  it("marcar um chip escreve a situação na URL, preservando o bairro", async () => {
    const usuario = userEvent.setup()
    renderizar("bairro=uv-03")

    await usuario.click(screen.getByRole("button", { name: "Em andamento" }))

    expect(replace).toHaveBeenCalledWith(
      "/obras?bairro=uv-03&situacao=em_andamento",
      { scroll: false }
    )
  })

  it("filtro sem obra mostra 'Nenhuma obra com estes filtros', resumo zerado e uma ação que limpa tudo", async () => {
    const usuario = userEvent.setup()
    renderizar("situacao=concluida")

    expect(
      screen.getByRole("heading", { name: "Nenhuma obra com estes filtros" })
    ).toBeVisible()
    expect(within(cartao("Total de obras")).getByText("0")).toBeVisible()
    expect(within(cartao("Sem localização")).getByText("0")).toBeVisible()

    await usuario.click(screen.getByRole("button", { name: "Limpar filtros" }))

    expect(replace).toHaveBeenCalledWith("/obras", { scroll: false })
  })

  it("sem obra nenhuma cadastrada mostra o estado vazio, sem ação de limpar", () => {
    renderizar("", [])

    expect(
      screen.getByRole("heading", { name: "Nenhuma obra cadastrada" })
    ).toBeVisible()
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).toBeNull()
    expect(within(cartao("Total de obras")).getByText("0")).toBeVisible()
  })

  it("clicar num bairro no mapa filtra por ele", async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(
      screen.getByRole("button", { name: "clicar em São Benedito" })
    )

    expect(replace).toHaveBeenCalledWith("/obras?bairro=uv-03", {
      scroll: false,
    })
  })
})

describe("PainelObras: bairro inválido (TU-16, CA-04.16, DV-35)", () => {
  it("mostra o aviso de bairro não reconhecido e segue com todas as obras, sem repetir o valor da URL", () => {
    renderizar("bairro=xx-segredo")

    expect(
      screen.getByRole("heading", { name: "Bairro não reconhecido" })
    ).toBeVisible()
    expect(screen.getByText("Mostrando 4 obras.")).toBeVisible()
    expect(within(cartao("Total de obras")).getByText("4")).toBeVisible()
    expect(screen.queryByText(/segredo/)).toBeNull()
  })

  it("'Limpar bairro' tira o bairro da URL", async () => {
    const usuario = userEvent.setup()
    renderizar("bairro=xx")

    await usuario.click(screen.getByRole("button", { name: "Limpar bairro" }))

    expect(replace).toHaveBeenCalledWith("/obras", { scroll: false })
  })
})

describe("PainelObras: seleção e ficha (CA-04.27, RF-04.10, RF-04.11)", () => {
  it("abrir pela lista destaca o marcador, abre a ficha e deixa a linha com aria-current", async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(
      screen.getByRole("button", { name: "DEMO - Via em São Benedito" })
    )

    expect(screen.getByText("Obra destacada: obra-benedito")).toBeVisible()
    const ficha = await screen.findByRole("dialog")
    expect(
      within(ficha).getByRole("heading", { name: "DEMO - Via em São Benedito" })
    ).toBeVisible()
    expect(within(ficha).getByText("SINTETICO")).toBeVisible()
    expect(
      screen.getByRole("row", {
        name: /DEMO - Via em São Benedito/,
        hidden: true,
      })
    ).toHaveAttribute("aria-current", "true")
  })

  it("clicar no marcador abre a ficha dessa obra e destaca a linha dela", async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(
      screen.getByRole("button", { name: "marcador DEMO - Praça no Centro" })
    )

    const ficha = await screen.findByRole("dialog")
    expect(
      within(ficha).getByRole("heading", { name: "DEMO - Praça no Centro" })
    ).toBeVisible()
    expect(within(ficha).getByText("Centro")).toBeVisible()
    expect(screen.getByText("Obra destacada: obra-centro")).toBeVisible()
  })

  it("fechar a ficha mantém a obra destacada e devolve o foco ao botão dela na lista", async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(
      screen.getByRole("button", { name: "marcador DEMO - Praça no Centro" })
    )
    await screen.findByRole("dialog")

    await usuario.click(screen.getByRole("button", { name: "Fechar" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(screen.getByText("Obra destacada: obra-centro")).toBeVisible()
    expect(document.activeElement).toBe(
      document.getElementById("botao-obra-obra-centro")
    )
  })

  it("mostra o título com HTML como texto literal na lista e na ficha (TU-14)", async () => {
    const usuario = userEvent.setup()
    renderizar("", [montarObra({ id: "obra-html", titulo: "<b>x</b>" })])

    await usuario.click(screen.getByRole("button", { name: "<b>x</b>" }))

    const ficha = await screen.findByRole("dialog")
    expect(
      within(ficha).getByRole("heading", { name: "<b>x</b>" })
    ).toBeVisible()
    expect(document.querySelector("b")).toBeNull()
  })
})

describe("PainelObras: quem pode editar (RF-04.14, CA-04.03)", () => {
  const ANALISTA = { podeEditar: true }

  it("o analista vê Nova obra e a ficha oferece Editar; o visitante não vê nenhum dos dois", async () => {
    const usuario = userEvent.setup()
    const { unmount } = renderizar("", OBRAS, ANALISTA)
    expect(screen.getByRole("button", { name: "Nova obra" })).toBeVisible()
    await usuario.click(
      screen.getByRole("button", { name: "marcador DEMO - Praça no Centro" })
    )
    expect(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Editar obra",
      })
    ).toBeVisible()
    unmount()

    renderizar("", OBRAS, { podeEditar: false })
    expect(screen.queryByRole("button", { name: "Nova obra" })).toBeNull()
    await usuario.click(
      screen.getByRole("button", { name: "marcador DEMO - Praça no Centro" })
    )
    expect(
      within(await screen.findByRole("dialog")).queryByRole("button", {
        name: "Editar obra",
      })
    ).toBeNull()
  })

  it("Nova obra troca a lista pelo formulário, liga o modo escolher ponto no mapa e o clique vai ao formulário", async () => {
    const usuario = userEvent.setup()
    renderizar("", OBRAS, ANALISTA)
    expect(screen.getByText("Escolhendo ponto: não")).toBeVisible()

    await usuario.click(screen.getByRole("button", { name: "Nova obra" }))

    expect(
      screen.getByRole("form", { name: "Formulário (double)" })
    ).toBeVisible()
    expect(screen.getByText("Editando: nova obra")).toBeVisible()
    expect(screen.queryByRole("heading", { name: "Lista de obras" })).toBeNull()
    expect(screen.getByText("Escolhendo ponto: sim")).toBeVisible()

    await usuario.click(
      screen.getByRole("button", { name: "clicar num ponto livre do mapa" })
    )
    expect(mockDefinirPonto).toHaveBeenCalledWith({
      longitude: -40.1,
      latitude: -2.9,
    })
  })

  it("o ponto que o formulário informa vira o ponto provisório do mapa e some ao cancelar", async () => {
    const usuario = userEvent.setup()
    renderizar("", OBRAS, ANALISTA)
    await usuario.click(screen.getByRole("button", { name: "Nova obra" }))

    await usuario.click(
      screen.getByRole("button", { name: "digitar coordenadas" })
    )
    expect(screen.getByText("Ponto provisório: -40.2;-2.8")).toBeVisible()

    await usuario.click(
      screen.getByRole("button", { name: "cancelar (double)" })
    )
    expect(screen.getByText("Ponto provisório: nenhum")).toBeVisible()
    expect(screen.getByText("Escolhendo ponto: não")).toBeVisible()
  })

  it("cancelar volta à lista e devolve o foco a Nova obra", async () => {
    const usuario = userEvent.setup()
    renderizar("", OBRAS, ANALISTA)
    await usuario.click(screen.getByRole("button", { name: "Nova obra" }))

    await usuario.click(
      screen.getByRole("button", { name: "cancelar (double)" })
    )

    expect(
      screen.getByRole("heading", { name: "Lista de obras" })
    ).toBeVisible()
    expect(screen.getByRole("button", { name: "Nova obra" })).toHaveFocus()
  })

  it("salvar uma obra nova seleciona a obra salva, volta à lista e devolve o foco a Nova obra", async () => {
    const usuario = userEvent.setup()
    renderizar("", OBRAS, ANALISTA)
    await usuario.click(screen.getByRole("button", { name: "Nova obra" }))

    await usuario.click(screen.getByRole("button", { name: "salvar (double)" }))

    expect(screen.getByText("Obra destacada: obra-nova")).toBeVisible()
    expect(
      screen.getByRole("heading", { name: "Lista de obras" })
    ).toBeVisible()
    expect(screen.getByRole("button", { name: "Nova obra" })).toHaveFocus()
  })

  it("Editar na ficha fecha a ficha, abre o formulário com a obra e o ponto dela no mapa", async () => {
    const usuario = userEvent.setup()
    renderizar(
      "",
      [
        montarObra({
          id: "obra-com-ponto",
          titulo: "DEMO - Com ponto",
          estadoLocalizacao: "dentro-de-bairro",
          bairroId: "uv-10",
          localizacao: { longitude: -40.118958, latitude: -2.885116 },
        }),
      ],
      ANALISTA
    )
    await usuario.click(
      screen.getByRole("button", { name: "DEMO - Com ponto" })
    )
    const ficha = await screen.findByRole("dialog")

    await usuario.click(
      within(ficha).getByRole("button", { name: "Editar obra" })
    )

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(screen.getByText("Editando: DEMO - Com ponto")).toBeVisible()
    expect(
      screen.getByText("Ponto provisório: -40.118958;-2.885116")
    ).toBeVisible()
  })

  it("cancelar a edição devolve o foco ao botão da obra editada na lista", async () => {
    const usuario = userEvent.setup()
    renderizar("", OBRAS, ANALISTA)
    await usuario.click(
      screen.getByRole("button", { name: "DEMO - Via em São Benedito" })
    )
    await usuario.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Editar obra",
      })
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())

    await usuario.click(
      screen.getByRole("button", { name: "cancelar (double)" })
    )

    expect(document.activeElement).toBe(
      document.getElementById("botao-obra-obra-benedito")
    )
  })
})

describe("PainelObras: nova=1 (CA-04.22)", () => {
  it("com nova=1 o analista abre direto no formulário, e ao fechar o parâmetro sai da URL preservando os filtros", async () => {
    const usuario = userEvent.setup()
    renderizar("nova=1&bairro=uv-10", OBRAS, {
      podeEditar: true,
      abrirNova: true,
    })
    expect(
      screen.getByRole("form", { name: "Formulário (double)" })
    ).toBeVisible()

    await usuario.click(
      screen.getByRole("button", { name: "cancelar (double)" })
    )

    expect(replace).toHaveBeenCalledWith("/obras?bairro=uv-10", {
      scroll: false,
    })
  })

  it("sem permissão o nova=1 não abre formulário nenhum", () => {
    renderizar("nova=1", OBRAS, { podeEditar: false, abrirNova: true })

    expect(screen.queryByRole("form")).toBeNull()
    expect(
      screen.getByRole("heading", { name: "Lista de obras" })
    ).toBeVisible()
  })
})

describe("PainelObras: Baixar mapa (PNG) (RF-05.22, PA-05.10)", () => {
  it("oferece o botão, desabilitado enquanto o mapa não entrega a instância", () => {
    renderizar()

    expect(
      screen.getByRole("button", { name: "Baixar mapa (PNG)" })
    ).toBeDisabled()
  })
})
