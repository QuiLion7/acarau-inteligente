"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  comFiltros,
  lerFiltros,
  resolverBairro,
  TODOS,
  type SelecaoBairro,
} from "@/lib/filtros/filtros-url"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"

type FiltroBairro = {
  selecao: SelecaoBairro
  selecionar: (idBairro: string) => void
  limpar: () => void
}

// O bairro selecionado vive só na URL (DV-12): selecionar e limpar trocam o `bairro` e preservam o resto da
// consulta. O `replace` não empilha histórico a cada clique e `scroll: false` mantém a posição da página.
export function useFiltroBairro(
  bairros: readonly BairroResumo[]
): FiltroBairro {
  const router = useRouter()
  const pathname = usePathname()
  const parametros = useSearchParams()
  const filtros = lerFiltros(parametros)

  function trocarBairro(bairro: string) {
    const atual = parametros.toString()
    const destino = comFiltros(atual ? `${pathname}?${atual}` : pathname, {
      ...filtros,
      bairro,
    })
    router.replace(destino, { scroll: false })
  }

  return {
    selecao: resolverBairro(filtros, bairros),
    selecionar: trocarBairro,
    limpar: () => trocarBairro(TODOS),
  }
}
