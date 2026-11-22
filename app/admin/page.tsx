import type { Metadata } from "next"
import Link from "next/link"

import { ReiniciarDemo } from "@/app/admin/components/reiniciar-demo"
import { EstadoInterface } from "@/components/estados/estado-interface"
import { buttonVariants } from "@/components/ui/button"
import { rotuloDoPapel } from "@/lib/auth/papeis"
import { TEXTOS_AUDITORIA } from "@/lib/config/textos-auditoria"
import { exigirPapelNaPagina } from "@/lib/server/auth/dal"

export const metadata: Metadata = { title: "Administração" }

// Restrita ao administrador: reiniciar a demonstração (RF-02.43) e consultar a auditoria (RF-05.26).
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
      <section
        aria-labelledby="titulo-auditoria"
        className="flex flex-col gap-3"
      >
        <h2 id="titulo-auditoria" className="text-xl font-semibold">
          {TEXTOS_AUDITORIA.titulo}
        </h2>
        <p className="max-w-prose text-muted-foreground">
          {TEXTOS_AUDITORIA.descricao}
        </p>
        <Link
          href="/admin/auditoria"
          className={buttonVariants({ variant: "outline", className: "w-fit" })}
        >
          {TEXTOS_AUDITORIA.linkDaAdministracao}
        </Link>
      </section>
    </div>
  )
}
