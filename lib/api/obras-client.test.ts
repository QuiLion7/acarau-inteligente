import { ApiError } from "@/lib/api/api-error"
import { obrasClient } from "@/lib/api/obras-client"
import { montarObra } from "@/lib/obras/__fixtures__/obra"
import { obraEntradaSchema } from "@/lib/validations/obra-schema"

let fetchSimulado: jest.SpyInstance<
  ReturnType<typeof fetch>,
  Parameters<typeof fetch>
>

beforeEach(() => {
  fetchSimulado = jest.spyOn(globalThis, "fetch")
})

const ENTRADA = obraEntradaSchema.parse({
  titulo: "DEMO - Praça",
  situacao: "planejada",
})
const OBRA = montarObra({ titulo: "DEMO - Praça" })

describe("obrasClient.criar", () => {
  it("envia o POST com o corpo em JSON e devolve a obra validada", async () => {
    fetchSimulado.mockResolvedValue(Response.json(OBRA, { status: 201 }))

    const criada = await obrasClient.criar(ENTRADA)

    expect(criada).toEqual(OBRA)
    const [caminho, opcoes] = fetchSimulado.mock.calls[0]!
    expect(caminho).toBe("/api/obras")
    expect(opcoes).toMatchObject({
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    })
    expect(JSON.parse(String(opcoes?.body))).toEqual(ENTRADA)
  })

  it("repassa o erro de validação do servidor com o código e os campos", async () => {
    fetchSimulado.mockResolvedValue(
      Response.json(
        {
          code: "VALIDACAO",
          message: "Os dados enviados são inválidos.",
          details: {
            campos: { titulo: "O título deve ter pelo menos 3 caracteres." },
          },
          requestId: "r1",
        },
        { status: 400 }
      )
    )

    const erro = await obrasClient.criar(ENTRADA).catch((falha) => falha)

    expect(erro).toBeInstanceOf(ApiError)
    expect(erro).toMatchObject({
      code: "VALIDACAO",
      status: 400,
      details: {
        campos: { titulo: "O título deve ter pelo menos 3 caracteres." },
      },
    })
  })

  it("recusa uma resposta de sucesso que não é uma obra", async () => {
    fetchSimulado.mockResolvedValue(Response.json({ id: "x" }, { status: 201 }))

    await expect(obrasClient.criar(ENTRADA)).rejects.toThrow()
  })
})

describe("obrasClient.editar", () => {
  it("envia o PUT para o id da obra, com o id escapado na URL", async () => {
    fetchSimulado.mockResolvedValue(Response.json(OBRA))

    const editada = await obrasClient.editar(OBRA.id, ENTRADA)

    expect(editada).toEqual(OBRA)
    const [caminho, opcoes] = fetchSimulado.mock.calls[0]!
    expect(caminho).toBe(`/api/obras/${OBRA.id}`)
    expect(opcoes).toMatchObject({ method: "PUT" })
  })

  it("escapa um id fora do comum em vez de montar outro caminho", async () => {
    fetchSimulado.mockResolvedValue(Response.json(OBRA))

    await obrasClient.editar("../admin?x=1", ENTRADA)

    expect(fetchSimulado.mock.calls[0]![0]).toBe(
      "/api/obras/..%2Fadmin%3Fx%3D1"
    )
  })

  it("devolve o 401 como erro com o código NAO_AUTENTICADO", async () => {
    fetchSimulado.mockResolvedValue(
      Response.json(
        { code: "NAO_AUTENTICADO", message: "Entre para acessar esta área." },
        { status: 401 }
      )
    )

    await expect(obrasClient.editar(OBRA.id, ENTRADA)).rejects.toMatchObject({
      code: "NAO_AUTENTICADO",
      status: 401,
    })
  })
})
