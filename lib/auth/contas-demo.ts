import type { PapelRestrito } from "@/lib/auth/papeis"
import type { Ambiente } from "@/lib/config/ambiente"

// Conta de demo vinda do ambiente (RF-00.21, RF-00.22): não há tabela de usuários.
export type ContaDemo = {
  usuario: string
  nome: string
  papel: PapelRestrito
  senhaHash: string
}

// "Analista " e "analista" são a mesma conta; o usuário gravado na sessão é sempre o normalizado.
export function normalizarUsuario(usuario: string): string {
  return usuario.trim().toLowerCase()
}

export function contasDoAmbiente(ambiente: Ambiente): ContaDemo[] {
  return [
    {
      usuario: normalizarUsuario(ambiente.DEMO_ANALISTA_USUARIO),
      nome: ambiente.DEMO_ANALISTA_NOME,
      papel: "analista",
      senhaHash: ambiente.DEMO_ANALISTA_SENHA_HASH,
    },
    {
      usuario: normalizarUsuario(ambiente.DEMO_ADMIN_USUARIO),
      nome: ambiente.DEMO_ADMIN_NOME,
      papel: "administrador",
      senhaHash: ambiente.DEMO_ADMIN_SENHA_HASH,
    },
  ]
}

export function buscarConta(
  usuario: string,
  ambiente: Ambiente
): ContaDemo | undefined {
  const procurado = normalizarUsuario(usuario)
  return contasDoAmbiente(ambiente).find((conta) => conta.usuario === procurado)
}
