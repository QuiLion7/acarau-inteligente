import { requisitar } from "@/lib/api/http-client"

// Só chama o handler de reset do próprio app (TechSpec §5); a resposta é 204, sem corpo.
export const demoClient = {
  async reiniciar(): Promise<void> {
    await requisitar("/api/demo/reset", { metodo: "POST" })
  },
}
