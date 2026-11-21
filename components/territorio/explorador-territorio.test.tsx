import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ExploradorTerritorio } from "@/components/territorio/explorador-territorio"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"

const replace = jest.fn()
const useSearchParams = jest.fn<URLSearchParams, []>()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/territorio",
  useSearchParams: () => useSearchParams(),
}))

// O MapLibre não roda em jsdom (TechSpec §8): o double expõe um botão por bairro e o estado que o explorador passa.
jest.mock("@/components/territorio/mapa-territorio", () => ({
  MapaTerritorio: ({
    bairros,
    escolas,
    selecionadoId,
    camadasLigadas,
    onSelecionar,
    onAbrirEscola,
  }: {
    bairros: { id: string; nome: string }[]
    escolas: { codigoInep: string; nome: string; posicao: unknown }[]
    selecionadoId: string | null
    camadasLigadas: ReadonlySet<string>
    onSelecionar: (id: string) => void
    onAbrirEscola: (codigoInep: string) => void
  }) => (
    <div role="group" aria-label="Mapa (double)">
      <p>Selecionado no mapa: {selecionadoId ?? "nenhum"}</p>
      <p>
        Camadas ligadas: {[...camadasLigadas].sort().join(",") || "nenhuma"}
      </p>
      {bairros.map(({ id, nome }) => (
        <button key={id} onClick={() => onSelecionar(id)}>
          selecionar bairro {nome}
        </button>
      ))}
      {escolas
        .filter(({ posicao }) => posicao !== null)
        .map(({ codigoInep, nome }) => (
          <button key={codigoInep} onClick={() => onAbrirEscola(codigoInep)}>
            abrir escola {nome}
          </button>
        ))}
    </div>
  ),
}))

const { bairros, limite, escolas, qualidade } = obterDadosTerritorio()

async function renderizar(consulta = "") {
  useSearchParams.mockReturnValue(new URLSearchParams(consulta))
  const resultado = render(
    <ExploradorTerritorio
      bairros={bairros}
      limite={limite}
      escolas={escolas}
      qualidade={qualidade}
    />
  )
  // O mapa entra por `next/dynamic`: espera o double carregar antes de cada teste.
  await screen.findByRole("group", { name: "Mapa (double)" })
  return resultado
}

describe("ExploradorTerritorio", () => {
  beforeEach(() => replace.mockClear())

  it("abre na lista de bairros e na tabela quando nada está selecionado", async () => {
    await renderizar()

    expect(
      screen.getByRole("tab", { name: "Bairros", selected: true })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("searchbox", { name: "Buscar bairro" })
    ).toBeInTheDocument()
    expect(screen.getAllByRole("row")).toHaveLength(25)
  })

  it("selecionar pela lista põe o bairro na URL, sem rolar a página, e abre a ficha", async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(
      within(screen.getByRole("tabpanel")).getByRole("button", {
        name: /Centro/,
      })
    )

    expect(replace).toHaveBeenCalledWith("/territorio?bairro=uv-10", {
      scroll: false,
    })
    expect(
      screen.getByRole("tab", { name: "Ficha do bairro", selected: true })
    ).toBeInTheDocument()
  })

  describe("foco na ficha (RF-02.46)", () => {
    // O router real atualizaria a URL; o double repassa o `replace` ao `useSearchParams` para a ficha abrir.
    function acompanharUrlDoReplace() {
      replace.mockImplementation((destino: string) => {
        const [, consulta = ""] = destino.split("?")
        useSearchParams.mockReturnValue(new URLSearchParams(consulta))
      })
    }

    it("escolher o bairro na lista com Enter leva o foco ao título da ficha", async () => {
      const usuario = userEvent.setup()
      await renderizar()
      acompanharUrlDoReplace()

      within(screen.getByRole("tabpanel"))
        .getByRole("button", { name: /Centro/ })
        .focus()
      await usuario.keyboard("{Enter}")

      expect(screen.getByRole("heading", { name: "Centro" })).toHaveFocus()
    })

    it("escolher o bairro pelo mapa não tira o foco de onde estava", async () => {
      const usuario = userEvent.setup()
      await renderizar()
      acompanharUrlDoReplace()

      await usuario.click(
        screen.getByRole("button", { name: "selecionar bairro Centro" })
      )

      expect(screen.getByRole("heading", { name: "Centro" })).not.toHaveFocus()
    })
  })

  it("selecionar pela tabela faz o mesmo", async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(
      within(screen.getByRole("table")).getByRole("button", { name: "Centro" })
    )

    expect(replace).toHaveBeenCalledWith("/territorio?bairro=uv-10", {
      scroll: false,
    })
  })

  it("com bairro na URL abre a ficha do Centro com 8 escolas e destaca a linha da tabela", async () => {
    await renderizar("bairro=uv-10")

    const ficha = screen.getByRole("article")
    expect(
      within(ficha).getByRole("heading", { name: "Centro" })
    ).toBeInTheDocument()
    expect(ficha).toHaveTextContent("8 escolas")
    expect(screen.getByRole("row", { name: /Centro/ })).toHaveAttribute(
      "data-state",
      "selected"
    )
    expect(
      screen.getByRole("tab", { name: "Ficha do bairro", selected: true })
    ).toBeInTheDocument()
  })

  it("limpar a seleção tira o bairro da URL e volta à lista", async () => {
    const usuario = userEvent.setup()
    await renderizar("bairro=uv-10&periodo=2025")

    await usuario.click(screen.getByRole("button", { name: "Limpar seleção" }))

    expect(replace).toHaveBeenCalledWith("/territorio?periodo=2025", {
      scroll: false,
    })
    expect(
      screen.getByRole("tab", { name: "Bairros", selected: true })
    ).toBeInTheDocument()
  })

  it("a aba Ficha sem bairro selecionado orienta a escolher um", async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(screen.getByRole("tab", { name: "Ficha do bairro" }))

    expect(
      screen.getByRole("heading", { name: "Nenhum bairro selecionado" })
    ).toBeInTheDocument()
    expect(screen.queryByRole("article")).not.toBeInTheDocument()
  })

  it("selecionar pelo mapa põe o bairro na URL e abre a ficha, como a lista", async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(
      screen.getByRole("button", { name: "selecionar bairro Centro" })
    )

    expect(replace).toHaveBeenCalledWith("/territorio?bairro=uv-10", {
      scroll: false,
    })
    expect(
      screen.getByRole("tab", { name: "Ficha do bairro", selected: true })
    ).toBeInTheDocument()
  })

  it("entrega ao mapa o bairro da URL como selecionado", async () => {
    await renderizar("bairro=uv-10")

    expect(screen.getByText("Selecionado no mapa: uv-10")).toBeInTheDocument()
  })

  it("o controle oferece só bairros, limite municipal e escolas, com as escolas desligadas de início", async () => {
    await renderizar()

    const controle = screen.getByRole("group", { name: "Camadas do mapa" })
    expect(within(controle).getAllByRole("switch")).toHaveLength(3)
    expect(
      within(controle).getByRole("switch", { name: "Escolas" })
    ).not.toBeChecked()
    expect(
      within(controle).getByRole("switch", { name: "Bairros" })
    ).toBeChecked()
    expect(
      within(controle).getByRole("switch", { name: "Limite municipal" })
    ).toBeChecked()
    expect(
      screen.getByText("Camadas ligadas: bairros,limite-municipal")
    ).toBeInTheDocument()
  })

  it("desligar o limite municipal avisa o mapa e deixa os bairros ligados", async () => {
    const usuario = userEvent.setup()
    await renderizar()

    // Clica no rótulo: o clique direto no span do Switch quebra no jsdom (dispatchClickWithModifiers do Base UI).
    await usuario.click(
      within(screen.getByRole("group", { name: "Camadas do mapa" })).getByText(
        "Limite municipal"
      )
    )

    expect(screen.getByText("Camadas ligadas: bairros")).toBeInTheDocument()
    expect(
      screen.getByRole("switch", { name: "Limite municipal" })
    ).not.toBeChecked()
  })

  it("mostra a legenda com a cobertura de 24 bairros da sede", async () => {
    await renderizar()

    const legenda = screen.getByRole("region", { name: "Legenda" })
    expect(legenda).toHaveTextContent("24 bairros")
    expect(legenda).toHaveTextContent("Bairro selecionado")
    expect(legenda).toHaveTextContent("Limite municipal")
  })

  it("ligar a camada de escolas avisa o mapa e a legenda passa a contar os 58 marcadores", async () => {
    const usuario = userEvent.setup()
    await renderizar()
    const legenda = screen.getByRole("region", { name: "Legenda" })
    expect(legenda).not.toHaveTextContent("marcadores")

    await usuario.click(
      within(screen.getByRole("group", { name: "Camadas do mapa" })).getByText(
        "Escolas"
      )
    )

    expect(
      screen.getByText("Camadas ligadas: bairros,escolas,limite-municipal")
    ).toBeInTheDocument()
    expect(legenda).toHaveTextContent("Escola dentro de bairro: 24 marcadores")
    expect(legenda).toHaveTextContent(
      "Escola fora da cobertura dos bairros: 33 marcadores"
    )
    expect(legenda).toHaveTextContent(
      "Escola fora do limite municipal: 1 marcador"
    )
    expect(legenda).toHaveTextContent(
      "58 estabelecimentos escolares georreferenciados na base disponível."
    )
  })

  it("abrir uma escola pelo mapa mostra a ficha dela na aba Escolas, sem trocar o bairro", async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(
      screen.getByRole("button", { name: "abrir escola VIRGEM PODEROSA ESC" })
    )

    expect(
      screen.getByRole("tab", { name: "Escolas", selected: true })
    ).toBeInTheDocument()
    const ficha = screen.getByRole("article", {
      name: "VIRGEM PODEROSA ESC",
    })
    expect(ficha).toHaveTextContent("23000872")
    expect(ficha).toHaveTextContent("Centro")
    expect(replace).not.toHaveBeenCalled()
  })

  it("abrir uma escola pela tabela mostra a mesma ficha, e fechar volta só à tabela", async () => {
    const usuario = userEvent.setup()
    await renderizar("bairro=uv-10")
    await usuario.click(screen.getByRole("tab", { name: "Escolas" }))

    await usuario.click(
      within(screen.getByRole("tabpanel")).getByRole("button", {
        name: "VIRGEM PODEROSA ESC",
      })
    )
    expect(
      screen.getByRole("article", { name: "VIRGEM PODEROSA ESC" })
    ).toBeInTheDocument()

    await usuario.click(
      screen.getByRole("button", { name: "Fechar ficha da escola" })
    )

    expect(screen.queryByRole("article")).not.toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Escolas de Centro" })
    ).toBeInTheDocument()
  })

  it("a aba Escolas com Outra Banda selecionada diz que não há escola da base no bairro", async () => {
    const usuario = userEvent.setup()
    await renderizar("bairro=uv-01")

    await usuario.click(screen.getByRole("tab", { name: "Escolas" }))

    expect(
      within(screen.getByRole("tabpanel")).getByText(
        /Nenhuma escola da base disponível dentro deste bairro/
      )
    ).toBeInTheDocument()
  })

  it("mostra o quadro de qualidade da base de escolas com os números do artefato", async () => {
    await renderizar()

    const quadro = screen.getByRole("region", {
      name: "Qualidade da base de escolas",
    })
    expect(quadro).toHaveTextContent("58 estabelecimentos escolares")
    expect(within(quadro).getAllByRole("listitem")).toHaveLength(5)
  })
})
