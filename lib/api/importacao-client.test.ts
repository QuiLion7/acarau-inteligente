import { importacaoClient } from "@/lib/api/importacao-client"
import { DADOS_DO_ROTEIRO } from "@/test/importacao-teste"

let fetchSimulado: jest.SpyInstance<
  ReturnType<typeof fetch>,
  Parameters<typeof fetch>
>

beforeEach(() => {
  fetchSimulado = jest.spyOn(globalThis, "fetch")
})

const HASH = "a".repeat(64)

describe("importacaoClient.conteudoImportado", () => {
  it("consulta o hash e devolve o dataset que já tem o conteúdo", async () => {
    fetchSimulado.mockResolvedValue(
      Response.json({
        importado: true,
        datasetId: "d1",
        nome: "Roteiro",
        numero: 2,
      })
    )

    const resposta = await importacaoClient.conteudoImportado(HASH)

    expect(fetchSimulado).toHaveBeenCalledWith(
      `/api/importacoes/conteudo/${HASH}`,
      expect.objectContaining({ method: "GET" })
    )
    expect(resposta).toEqual({
      importado: true,
      datasetId: "d1",
      nome: "Roteiro",
      numero: 2,
    })
  })

  it("rejeita resposta fora do contrato em vez de assumir o tipo", async () => {
    fetchSimulado.mockResolvedValue(Response.json({ importado: "talvez" }))

    await expect(importacaoClient.conteudoImportado(HASH)).rejects.toThrow()
  })
})

describe("importacaoClient.confirmar", () => {
  it("envia multipart com o arquivo e os dados em JSON, sem Content-Type manual (TU-21)", async () => {
    fetchSimulado.mockResolvedValue(
      Response.json(
        { datasetId: "d1", versaoId: "v1", numero: 1 },
        { status: 201 }
      )
    )

    const gravada = await importacaoClient.confirmar({
      arquivo: { nome: "roteiro.csv", bytes: new Uint8Array([98, 99]) },
      dados: DADOS_DO_ROTEIRO,
    })

    const [caminho, opcoes] = fetchSimulado.mock.calls[0] ?? []
    expect(caminho).toBe("/api/importacoes")
    expect(opcoes?.method).toBe("POST")
    expect(opcoes?.headers).toBeUndefined()
    const corpo = opcoes?.body
    expect(corpo).toBeInstanceOf(FormData)
    const formulario = corpo as FormData
    const arquivo = formulario.get("arquivo") as File
    expect(arquivo.name).toBe("roteiro.csv")
    expect(arquivo.size).toBe(2)
    expect(JSON.parse(String(formulario.get("dados")))).toEqual(
      DADOS_DO_ROTEIRO
    )
    expect(gravada).toEqual({ datasetId: "d1", versaoId: "v1", numero: 1 })
  })

  it("propaga o erro do envelope, com o status", async () => {
    fetchSimulado.mockResolvedValue(
      Response.json(
        {
          code: "CONTEUDO_JA_IMPORTADO",
          message: "Este arquivo já foi importado.",
        },
        { status: 409 }
      )
    )

    await expect(
      importacaoClient.confirmar({
        arquivo: { nome: "a.csv", bytes: new Uint8Array() },
        dados: DADOS_DO_ROTEIRO,
      })
    ).rejects.toMatchObject({ code: "CONTEUDO_JA_IMPORTADO", status: 409 })
  })
})
