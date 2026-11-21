import type { Metadata } from "next"

import { ReiniciarDemo } from "@/app/admin/components/reiniciar-demo"
import { EstadoInterface } from "@/components/estados/estado-interface"
import { rotuloDoPapel } from "@/lib/auth/papeis"
import { exigirPapelNaPagina } from "@/lib/server/auth/dal"

export const metadata: Metadata = { title: "Administração" }

// Restrita ao administrador. Hoje a única operação é reiniciar a demonstração (RF-02.43); o EP-05 acrescenta as demais.
export default async function PaginaAdmin() {
  const acesso = await exigirPapelNaPagina("administrador", "/admin")
  if (acesso.tipo === "sem-permissao") {
    return <EstadoInterface tipo="sem-permissao" nivelTitulo={1} />
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Administração</h1>
      <p>
        Você entrou como {acesso.sessao.nome} (
        {rotuloDoPapel(acesso.sessao.papel)}).
      </p>
      <ReiniciarDemo />
    </div>
  )
}
