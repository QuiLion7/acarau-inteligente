import type { Metadata } from "next"
import Link from "next/link"

import { TabelaDatasets } from "@/components/datasets/tabela-datasets"
import { EstadoInterface } from "@/components/estados/estado-interface"
import { buttonVariants } from "@/components/ui/button"
import { exigirPapelNaPagina } from "@/lib/server/auth/dal"

export const metadata: Metadata = { title: "Datasets" }

// Restrita a analista e administrador (RF-02.27): o servidor decide o acesso e a lista só chega pela API restrita.
export default async function PaginaDatasets() {
  const acesso = await exigirPapelNaPagina("analista", "/saude/datasets")
  if (acesso.tipo === "sem-permissao") {
    return <EstadoInterface tipo="sem-permissao" nivelTitulo={1} />
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Datasets</h1>
        <p className="text-muted-foreground">
          Datasets importados e suas versões. Uma versão nasce privada e só o
          visitante a vê depois de publicada. Os dados são sempre sintéticos.
        </p>
        <div>
          <Link
            href="/saude/importar"
            className={buttonVariants({ variant: "outline" })}
          >
            Importar CSV
          </Link>
        </div>
      </header>
      <TabelaDatasets />
    </div>
  )
}
