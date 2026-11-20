import { z } from "zod"

// Fonte única do login: o formulário e a rota usam este schema (react-next.md §6, seguranca.md §6).
export const USUARIO_TAMANHO_MAXIMO = 100
export const SENHA_TAMANHO_MAXIMO = 200

export const entrarSchema = z.object({
  usuario: z
    .string("Informe o usuário.")
    .trim()
    .min(1, "Informe o usuário.")
    .max(
      USUARIO_TAMANHO_MAXIMO,
      `O usuário deve ter no máximo ${USUARIO_TAMANHO_MAXIMO} caracteres.`
    ),
  senha: z
    .string("Informe a senha.")
    .min(1, "Informe a senha.")
    .max(
      SENHA_TAMANHO_MAXIMO,
      `A senha deve ter no máximo ${SENHA_TAMANHO_MAXIMO} caracteres.`
    ),
})

export type EntrarDados = z.infer<typeof entrarSchema>
