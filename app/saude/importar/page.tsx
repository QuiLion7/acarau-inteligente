import type { Metadata } from "next"

import { AssistenteImportacao } from "@/components/importacao/assistente-importacao"
import { EstadoInterface } from "@/components/estados/estado-interface"
import { exigirPapelNaPagina } from "@/lib/server/auth/dal"
import { listarResumoBairros } from "@/lib/server/territorio/territorio-repositorio"

export const metadata: Metadata = { title: "Importar CSV" }

// Restrita a analista e administrador (RF-02.27); o servidor decide o acesso, esconder o link é só conveniência.
// Os 24 bairros vão por props: o motor roda no navegador e precisa deles para reconhecer os nomes (DEC-T-01).
export default async function PaginaImportarCsv() {
  const acesso = await exigirPapelNaPagina("analista", "/saude/importar")
  if (acesso.tipo === "sem-permissao") {
    return <EstadoInterface tipo="sem-permissao" nivelTitulo={1} />
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Importar CSV</h1>
        <p className="text-muted-foreground">
          Importe contagens de saúde por bairro e período. Nada é gravado até a
          confirmação, e os dados da demonstração são sempre sintéticos.
        </p>
      </header>
      <AssistenteImportacao bairros={listarResumoBairros()} />
    </div>
  )
}
