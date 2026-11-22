"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

const PARAMETRO_NOVA = "nova"

// `/obras?nova=1` (atalho da Área do analista, RF-04.33) abre o formulário de nova obra. Ao fechar ou salvar o
// parâmetro sai da URL, preservando o resto da consulta, para recarregar a página não reabrir o formulário.
export function useParametroNovaObra(): { remover: () => void } {
  const router = useRouter()
  const pathname = usePathname()
  const parametros = useSearchParams()

  function remover() {
    if (!parametros.has(PARAMETRO_NOVA)) return
    const proximos = new URLSearchParams(parametros)
    proximos.delete(PARAMETRO_NOVA)
    const consulta = proximos.toString()
    router.replace(consulta ? `${pathname}?${consulta}` : pathname, {
      scroll: false,
    })
  }

  return { remover }
}
