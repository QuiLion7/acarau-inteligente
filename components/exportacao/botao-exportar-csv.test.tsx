import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"

import { BotaoExportarCsv } from "@/components/exportacao/botao-exportar-csv"
import { baixarBlob } from "@/lib/exportacao/baixar-arquivo"
import type { ColunaCsv } from "@/lib/exportacao/csv"

jest.mock("@/lib/exportacao/baixar-arquivo", () => ({ baixarBlob: jest.fn() }))
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }))

type Linha = { nome: string }
const COLUNAS: ColunaCsv<Linha>[] = [
  { cabecalho: "Nome", valor: ({ nome }) => nome },
]

// O Blob do jsdom não tem `arrayBuffer()`/`text()`: a leitura passa pelo FileReader.
function lerBytes(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(leitor.result as ArrayBuffer)
    leitor.readAsArrayBuffer(blob)
  })
}

function lerTexto(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(leitor.result as string)
    leitor.readAsText(blob, "utf-8")
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers({
    now: new Date("2026-11-22T15:00:00.000Z"),
    doNotFake: ["setTimeout", "setInterval", "queueMicrotask", "nextTick"],
  })
})

afterEach(() => jest.useRealTimers())

describe("BotaoExportarCsv (RF-05.18)", () => {
  it("tem o rótulo visível 'Exportar CSV' e o nome acessível que o começa e diz qual tabela", () => {
    render(
      <BotaoExportarCsv
        colunas={COLUNAS}
        obterLinhas={() => []}
        tipo="obras"
        descricao="lista de obras"
      />
    )

    const botao = screen.getByRole("button", {
      name: "Exportar CSV: lista de obras",
    })
    expect(botao).toHaveTextContent("Exportar CSV")
  })

  it("no clique baixa o CSV das linhas do momento, com o BOM, e o nome com produto, tipo, data e bairro", async () => {
    const usuario = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    let linhas: Linha[] = [{ nome: "A" }]
    render(
      <BotaoExportarCsv
        colunas={COLUNAS}
        obterLinhas={() => linhas}
        tipo="obras"
        bairro="São José"
        descricao="obras"
      />
    )
    linhas = [{ nome: "A" }, { nome: "=1+1" }]

    await usuario.click(screen.getByRole("button", { name: /Exportar CSV/ }))

    expect(baixarBlob).toHaveBeenCalledTimes(1)
    const [blob, nome] = jest.mocked(baixarBlob).mock.calls[0]
    expect(nome).toBe("acarau-inteligente_obras_2026-11-22_sao-jose.csv")
    const bytes = new Uint8Array(await lerBytes(blob))
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    // O leitor de texto descarta o BOM (já conferido nos bytes acima).
    expect(await lerTexto(blob)).toBe("Nome\r\nA\r\n'=1+1\r\n")
  })

  it("sem bairro o nome não leva o trecho do bairro", async () => {
    const usuario = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(
      <BotaoExportarCsv
        colunas={COLUNAS}
        obterLinhas={() => []}
        tipo="escolas"
        descricao="escolas"
      />
    )

    await usuario.click(screen.getByRole("button", { name: /Exportar CSV/ }))

    expect(jest.mocked(baixarBlob).mock.calls[0][1]).toBe(
      "acarau-inteligente_escolas_2026-11-22.csv"
    )
  })

  it("se a geração falha mostra a mensagem recuperável e não baixa nada", async () => {
    const usuario = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    jest.spyOn(console, "error").mockImplementation(() => undefined)
    render(
      <BotaoExportarCsv
        colunas={[{ cabecalho: "n", valor: () => Number.NaN }]}
        obterLinhas={() => [{ nome: "x" }]}
        tipo="obras"
        descricao="obras"
      />
    )

    await usuario.click(screen.getByRole("button", { name: /Exportar CSV/ }))

    expect(baixarBlob).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith(
      "Não foi possível exportar o CSV. Tente de novo."
    )
  })
})
