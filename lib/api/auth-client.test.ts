import { authClient } from "@/lib/api/auth-client"

let fetchSimulado: jest.SpyInstance<
  ReturnType<typeof fetch>,
  Parameters<typeof fetch>
>

// `restoreMocks` desfaz o spy a cada teste; ele é recriado antes de cada um.
beforeEach(() => {
  fetchSimulado = jest.spyOn(globalThis, "fetch")
})

describe("authClient", () => {
  it("entrar envia usuário e senha por POST ao endpoint de login", async () => {
    fetchSimulado.mockResolvedValue(Response.json({ usuario: "analista" }))

    await authClient.entrar({ usuario: "analista", senha: "segredo" })

    expect(fetchSimulado).toHaveBeenCalledWith(
      "/api/auth/entrar",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ usuario: "analista", senha: "segredo" }),
      })
    )
  })

  it("entrar propaga a mensagem do servidor quando as credenciais são recusadas", async () => {
    fetchSimulado.mockResolvedValue(
      Response.json(
        {
          code: "CREDENCIAIS_INVALIDAS",
          message: "Usuário ou senha inválidos.",
          requestId: "id",
        },
        { status: 401 }
      )
    )

    await expect(
      authClient.entrar({ usuario: "a", senha: "b" })
    ).rejects.toMatchObject({
      name: "ApiError",
      code: "CREDENCIAIS_INVALIDAS",
      message: "Usuário ou senha inválidos.",
    })
  })

  it("sair chama o endpoint de logout por POST", async () => {
    fetchSimulado.mockResolvedValue(new Response(null, { status: 204 }))

    await authClient.sair()

    expect(fetchSimulado).toHaveBeenCalledWith(
      "/api/auth/sair",
      expect.objectContaining({ method: "POST" })
    )
  })
})
