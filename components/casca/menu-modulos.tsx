"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import type { Papel } from "@/lib/auth/papeis"
import { itensDoMenu, moduloAtivo } from "@/lib/config/modulos"
import { comFiltros, lerFiltros } from "@/lib/filtros/filtros-url"
import { cn } from "@/lib/utils"

type MenuModulosProps = {
  papel?: Papel
  orientacao?: "horizontal" | "vertical"
  onNavegar?: () => void
}

// Client por causa de usePathname/useSearchParams; precisa de Suspense no pai (react-next.md §4).
export function MenuModulos({
  papel = "visitante",
  orientacao = "horizontal",
  onNavegar,
}: MenuModulosProps) {
  const pathname = usePathname()
  const filtros = lerFiltros(useSearchParams())

  return (
    <nav aria-label="Módulos">
      <ul
        className={cn(
          "flex gap-1",
          orientacao === "vertical" ? "flex-col" : "flex-row flex-wrap"
        )}
      >
        {itensDoMenu(papel).map((item) => {
          const Icone = item.icone
          const ativo = moduloAtivo(item.rota, pathname)
          return (
            <li key={item.id}>
              <Link
                href={comFiltros(item.rota, filtros)}
                aria-current={ativo ? "page" : undefined}
                onClick={onNavegar}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-[current=page]:bg-primary/10 aria-[current=page]:font-medium aria-[current=page]:text-primary"
              >
                <Icone aria-hidden className="size-4" />
                {item.rotulo}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
