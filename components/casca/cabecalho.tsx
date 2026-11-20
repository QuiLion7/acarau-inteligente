import Link from "next/link"
import { Suspense } from "react"

import { AreaSessao } from "@/components/casca/area-sessao"
import { MenuModulos } from "@/components/casca/menu-modulos"
import { MenuMovel } from "@/components/casca/menu-movel"
import { SeloDemonstracao } from "@/components/casca/selo-demonstracao"
import { obterSessaoAtual } from "@/lib/server/auth/dal"
import { NOME_PRODUTO } from "@/lib/config/textos-demonstracao"

// Server Component: lê a sessão pelo DAL (desvio previsto na TechSpec §12, em vez de TanStack Query) e passa o
// papel real ao menu. Ler o cookie aqui torna as rotas dinâmicas (risco R-ROTAS-DINAMICAS, medido no RNF-00.07).
export async function Cabecalho() {
  const sessao = await obterSessaoAtual()
  const papel = sessao?.papel ?? "visitante"

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link
          href="/"
          className="rounded-sm text-lg font-semibold text-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {NOME_PRODUTO}
        </Link>
        <SeloDemonstracao />
        <div className="ml-auto flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
          <div className="hidden md:block">
            <Suspense fallback={null}>
              <MenuModulos papel={papel} />
            </Suspense>
          </div>
          <AreaSessao sessao={sessao} />
          <div className="md:hidden">
            <MenuMovel papel={papel} />
          </div>
        </div>
      </div>
    </header>
  )
}
