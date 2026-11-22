"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

const PARAMETROS_DE_FILTRO = ["tipo", "conta", "de", "ate", "pagina"] as const

type ParametrosAuditoria = {
  /** Troca filtros na URL (valor `null` tira o parâmetro) e volta à primeira página. */
  aplicarFiltros: (mudancas: Record<string, string | null>) => void
  limparFiltros: () => void
  irParaPagina: (numero: number) => void
}

// Os filtros e a página da auditoria vivem só na URL (RF-05.27): escrever preserva o resto da consulta e o Server
// Component relê. Modelo: `use-filtro-situacao`.
export function useParametrosAuditoria(): ParametrosAuditoria {
  const router = useRouter()
  const pathname = usePathname()
  const parametros = useSearchParams()

  function navegar(proximos: URLSearchParams) {
    const consulta = proximos.toString()
    router.replace(consulta ? `${pathname}?${consulta}` : pathname, {
      scroll: false,
    })
  }

  function aplicarFiltros(mudancas: Record<string, string | null>) {
    const proximos = new URLSearchParams(parametros)
    proximos.delete("pagina")
    for (const [nome, valor] of Object.entries(mudancas)) {
      if (valor === null) proximos.delete(nome)
      else proximos.set(nome, valor)
    }
    navegar(proximos)
  }

  function limparFiltros() {
    const proximos = new URLSearchParams(parametros)
    for (const nome of PARAMETROS_DE_FILTRO) proximos.delete(nome)
    navegar(proximos)
  }

  function irParaPagina(numero: number) {
    const proximos = new URLSearchParams(parametros)
    if (numero <= 1) proximos.delete("pagina")
    else proximos.set("pagina", String(numero))
    navegar(proximos)
  }

  return { aplicarFiltros, limparFiltros, irParaPagina }
}
