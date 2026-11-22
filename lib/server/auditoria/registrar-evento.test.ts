import { inserirEvento } from "@/lib/server/auditoria/auditoria-repositorio"
import { registrarEvento } from "@/lib/server/auditoria/registrar-evento"
import type { Executor } from "@/lib/server/db/cliente"

jest.mock("@/lib/server/auditoria/auditoria-repositorio", () => ({
  inserirEvento: jest.fn(),
}))
jest.mock("@/lib/server/db/cliente", () => ({ obterBanco: jest.fn() }))

const AGORA = new Date("2026-11-22T12:00:00.000Z")
const REQUEST_ID = "6f1c2a9e-3b7d-4c11-9a0e-2d5b8f7c4e10"
const BANCO = { id: "banco-de-teste" } as unknown as Executor

let escrita: jest.SpyInstance

function linhasDoLog(): Record<string, unknown>[] {
  return escrita.mock.calls.map(([linha]) => JSON.parse(String(linha)))
}

beforeEach(() => {
  escrita = jest.spyOn(process.stdout, "write").mockImplementation(() => true)
  jest.mocked(inserirEvento).mockResolvedValue(undefined)
})

describe("registrarEvento (TU-12, PA-05.03)", () => {
  it("emite o log com o nome, o nível e os campos que o evento já tinha, e grava o evento filtrado pelo catálogo", async () => {
    await registrarEvento(
      {
        tipo: "importacao_confirmada",
        requestId: REQUEST_ID,
        conta: "analista",
        alvo: { tipo: "dataset_versao", id: "v-1" },
        detalhes: { numero: 2, linhas: 40, nomeArquivo: "casos.csv" },
        camposLog: { requestId: REQUEST_ID, usuario: "analista", numero: 2 },
      },
      { banco: BANCO, agora: AGORA }
    )

    expect(linhasDoLog()).toEqual([
      expect.objectContaining({
        nivel: "info",
        evento: "importacao.confirmada",
        requestId: REQUEST_ID,
        usuario: "analista",
        numero: 2,
      }),
    ])
    expect(inserirEvento).toHaveBeenCalledWith(BANCO, {
      ocorridoEm: AGORA,
      tipo: "importacao_confirmada",
      conta: "analista",
      alvo: { tipo: "dataset_versao", id: "v-1" },
      detalhes: { numero: 2, linhas: 40 },
      requestId: REQUEST_ID,
    })
  })

  it("usa nível warn para as recusas e grava sem alvo nem request id quando eles não existem", async () => {
    await registrarEvento(
      { tipo: "login_falha", conta: null, camposLog: { usuario: "ninguem" } },
      { banco: BANCO, agora: AGORA }
    )

    expect(linhasDoLog()[0]).toMatchObject({
      nivel: "warn",
      evento: "auth.login_falha",
      usuario: "ninguem",
    })
    expect(inserirEvento).toHaveBeenCalledWith(
      BANCO,
      expect.objectContaining({ conta: null, alvo: null, requestId: null })
    )
  })

  it("não lança quando a gravação falha: registra auditoria.falha_gravacao e o log do evento segue", async () => {
    jest.mocked(inserirEvento).mockRejectedValue(new Error("banco fora"))

    await expect(
      registrarEvento(
        {
          tipo: "obra_criada",
          requestId: REQUEST_ID,
          conta: "analista",
          camposLog: { requestId: REQUEST_ID, obraId: "o-1" },
        },
        { banco: BANCO, agora: AGORA }
      )
    ).resolves.toBeUndefined()

    const eventos = linhasDoLog().map((linha) => linha.evento)
    expect(eventos).toEqual(["obra.criada", "auditoria.falha_gravacao"])
    expect(linhasDoLog()[1]).toMatchObject({
      nivel: "error",
      tipo: "obra_criada",
      requestId: REQUEST_ID,
    })
  })
})
