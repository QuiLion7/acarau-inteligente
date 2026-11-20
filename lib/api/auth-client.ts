import { requisitar } from "@/lib/api/http-client"
import type { EntrarDados } from "@/lib/validations/entrar-schema"

// Só chama os handlers de autenticação do próprio app. O corpo do login não é lido: o cabeçalho
// relê a sessão no servidor depois do `router.refresh()`.
export const authClient = {
  async entrar(dados: EntrarDados): Promise<void> {
    await requisitar("/api/auth/entrar", { metodo: "POST", corpo: dados })
  },
  async sair(): Promise<void> {
    await requisitar("/api/auth/sair", { metodo: "POST" })
  },
}
