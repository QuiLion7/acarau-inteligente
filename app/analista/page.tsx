import type { Metadata } from "next"

import { EstadoInterface } from "@/components/estados/estado-interface"
import { rotuloDoPapel } from "@/lib/auth/papeis"
import { exigirPapelNaPagina } from "@/lib/server/auth/dal"

export const metadata: Metadata = { title: "Área do analista" }

// Restrita a analista e administrador; sem ações por enquanto: os EP-02 e EP-04 acrescentam as operações aqui.
export default async function PaginaAnalista() {
  const acesso = await exigirPapelNaPagina("analista", "/analista")
  if (acesso.tipo === "sem-permissao") {
    return <EstadoInterface tipo="sem-permissao" nivelTitulo={1} />
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">
        Área do analista
      </h1>
      <p>
        Você entrou como {acesso.sessao.nome} (
        {rotuloDoPapel(acesso.sessao.papel)}).
      </p>
      <p className="text-muted-foreground">
        Aqui ficarão as operações de carga e conferência de dados, que ainda não
        foram entregues nesta demonstração.
      </p>
    </div>
  )
}
