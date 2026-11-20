import type { Metadata } from "next"

import { EstadoInterface } from "@/components/estados/estado-interface"
import { rotuloDoPapel } from "@/lib/auth/papeis"
import { exigirPapelNaPagina } from "@/lib/server/auth/dal"

export const metadata: Metadata = { title: "Administração" }

// Restrita ao administrador; sem ações por enquanto: o EP-05 acrescenta as operações de administração aqui.
export default async function PaginaAdmin() {
  const acesso = await exigirPapelNaPagina("administrador", "/admin")
  if (acesso.tipo === "sem-permissao") {
    return <EstadoInterface tipo="sem-permissao" nivelTitulo={1} />
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">Administração</h1>
      <p>
        Você entrou como {acesso.sessao.nome} (
        {rotuloDoPapel(acesso.sessao.papel)}).
      </p>
      <p className="text-muted-foreground">
        Aqui ficarão as operações de administração, que ainda não foram
        entregues nesta demonstração.
      </p>
    </div>
  )
}
