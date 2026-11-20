import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { MapaResumo } from "@/components/territorio/mapa-resumo"
import { obterDadosMapaResumo } from "@/lib/server/territorio/territorio-repositorio"

const push = jest.fn()
const useSearchParams = jest.fn<URLSearchParams, []>()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => useSearchParams(),
}))

// O MapLibre não roda em jsdom: o double mostra o modo recebido, as camadas extras (que o resumo não leva) e um
// botão por bairro.
jest.mock("@/components/territorio/mapa-territorio", () => ({
  MapaTerritorio: ({
    modo,
    bairros,
    escolas,
    onSelecionar,
  }: {
    modo: string
    bairros: { id: string; nome: string }[]
    escolas?: unknown
    onSelecionar: (id: string) => void
  }) => (
    <div role="group" aria-label="Mapa (double)">
      <p>Modo: {modo}</p>
      <p>Escolas: {escolas === undefined ? "não enviadas" : "enviadas"}</p>
      {bairros.map(({ id, nome }) => (
        <button key={id} onClick={() => onSelecionar(id)}>
          selecionar bairro {nome}
        </button>
      ))}
    </div>
  ),
}))

const dados = obterDadosMapaResumo()

async function renderizar(consulta = "") {
  useSearchParams.mockReturnValue(new URLSearchParams(consulta))
  render(<MapaResumo {...dados} />)
  await screen.findByRole("group", { name: "Mapa (double)" })
}

describe("MapaResumo", () => {
  beforeEach(() => push.mockClear())

  it("monta o mapa em modo resumo, sem escolas", async () => {
    await renderizar()

    expect(screen.getByText("Modo: resumo")).toBeInTheDocument()
    expect(screen.getByText("Escolas: não enviadas")).toBeInTheDocument()
  })

  it("clicar num bairro leva ao Território com ele selecionado", async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(
      screen.getByRole("button", { name: "selecionar bairro Centro" })
    )

    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith("/territorio?bairro=uv-10")
  })

  it("o período já escolhido acompanha o visitante até o Território", async () => {
    const usuario = userEvent.setup()
    await renderizar("periodo=2025")

    await usuario.click(
      screen.getByRole("button", { name: "selecionar bairro Centro" })
    )

    expect(push).toHaveBeenCalledWith("/territorio?bairro=uv-10&periodo=2025")
  })
})
