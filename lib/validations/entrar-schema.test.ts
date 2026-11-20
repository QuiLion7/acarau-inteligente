import { entrarSchema } from "@/lib/validations/entrar-schema"

function mensagensPorCampo(dados: unknown): Record<string, string> {
  const resultado = entrarSchema.safeParse(dados)
  if (resultado.success) return {}
  return Object.fromEntries(
    resultado.error.issues.map((problema) => [
      String(problema.path[0]),
      problema.message,
    ])
  )
}

describe("entrarSchema", () => {
  it("aceita usuário e senha e tira os espaços das pontas do usuário", () => {
    const resultado = entrarSchema.parse({ usuario: "  analista ", senha: "x" })

    expect(resultado).toEqual({ usuario: "analista", senha: "x" })
  })

  it("não altera a senha, que pode ter espaços", () => {
    expect(entrarSchema.parse({ usuario: "a", senha: " x " }).senha).toBe(" x ")
  })

  it("pede usuário e senha quando vêm vazios", () => {
    expect(mensagensPorCampo({ usuario: "   ", senha: "" })).toEqual({
      usuario: "Informe o usuário.",
      senha: "Informe a senha.",
    })
  })

  it("recusa usuário acima de 100 e senha acima de 200 caracteres, aceitando os limites", () => {
    expect(
      mensagensPorCampo({ usuario: "a".repeat(100), senha: "b".repeat(200) })
    ).toEqual({})
    expect(
      mensagensPorCampo({ usuario: "a".repeat(101), senha: "b".repeat(201) })
    ).toEqual({
      usuario: "O usuário deve ter no máximo 100 caracteres.",
      senha: "A senha deve ter no máximo 200 caracteres.",
    })
  })

  it("recusa corpo sem os campos ou com tipo errado", () => {
    expect(mensagensPorCampo({})).toEqual({
      usuario: "Informe o usuário.",
      senha: "Informe a senha.",
    })
    expect(mensagensPorCampo({ usuario: 1, senha: 2 })).toEqual({
      usuario: "Informe o usuário.",
      senha: "Informe a senha.",
    })
    expect(entrarSchema.safeParse(undefined).success).toBe(false)
  })
})
