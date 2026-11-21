import type { Metadata } from "next"

import Link from "next/link"

import { EstadoInterface } from "@/components/estados/estado-interface"
import { rotuloDoPapel } from "@/lib/auth/papeis"
import { exigirPapelNaPagina } from "@/lib/server/auth/dal"

export const metadata: Metadata = { title: "Área do analista" }

// Restrita a analista e administrador. Aponta para as operações da Saúde (PA-02.02); o EP-04 acrescenta as das obras.
export default async function PaginaAnalista() {
  const acesso = await exigirPapelNaPagina("analista", "/analista")
  if (acesso.tipo === "sem-permissao") {
    return <EstadoInterface tipo="sem-permissao" nivelTitulo={1} />
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        Área do analista
      </h1>
      <p>
        Você entrou como {acesso.sessao.nome} (
        {rotuloDoPapel(acesso.sessao.papel)}).
      </p>
      <section aria-labelledby="titulo-saude" className="flex flex-col gap-2">
        <h2 id="titulo-saude" className="text-xl font-semibold">
          Saúde
        </h2>
        <p className="text-muted-foreground">
          Importe contagens de saúde por bairro e período e acompanhe os
          datasets importados.
        </p>
        <ul className="flex flex-col gap-1">
          <li>
            <Link
              href="/saude/importar"
              className="underline underline-offset-4"
            >
              Importar CSV
            </Link>
          </li>
          <li>
            <Link
              href="/saude/datasets"
              className="underline underline-offset-4"
            >
              Datasets
            </Link>
          </li>
        </ul>
      </section>
    </div>
  )
}
