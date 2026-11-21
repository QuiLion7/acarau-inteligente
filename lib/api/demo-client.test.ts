import { demoClient } from "@/lib/api/demo-client"

let fetchSimulado: jest.SpyInstance<
  ReturnType<typeof fetch>,
  Parameters<typeof fetch>
>

beforeEach(() => {
  fetchSimulado = jest.spyOn(globalThis, "fetch")
})

describe("demoClient.reiniciar", () => {
  it("chama o reset por POST, sem corpo, e aceita o 204", async () => {
    fetchSimulado.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(demoClient.reiniciar()).resolves.toBeUndefined()

    expect(fetchSimulado).toHaveBeenCalledWith(
      "/api/demo/reset",
      expect.objectContaining({ method: "POST", body: undefined })
    )
  })

  it("propaga a recusa do servidor com o código e o status", async () => {
    fetchSimulado.mockResolvedValue(
      Response.json(
        {
          code: "SEM_PERMISSAO",
          message: "Você não tem permissão para acessar esta área.",
        },
        { status: 403 }
      )
    )

    await expect(demoClient.reiniciar()).rejects.toMatchObject({
      code: "SEM_PERMISSAO",
      status: 403,
    })
  })
})
