"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { SeletorSaude } from "@/components/saude/seletor-saude"
import type { OpcaoDeVersao } from "@/lib/saude/analise-dataset"

type SeletorVersaoProps = {
  opcoes: readonly OpcaoDeVersao[]
  versaoId: string
}

const SUFIXO_PRIVADO = " (privado)"

// Troca a versão em exibição (RF-02.28): a URL passa a levar `versao` e o servidor decide o que o papel pode ver.
export function SeletorVersao({ opcoes, versaoId }: SeletorVersaoProps) {
  const router = useRouter()
  const pathname = usePathname()
  const parametros = useSearchParams()

  function handleTrocar(novaVersao: string) {
    const proximos = new URLSearchParams(parametros)
    proximos.set("versao", novaVersao)
    router.replace(`${pathname}?${proximos}`, { scroll: false })
  }

  return (
    <SeletorSaude
      id="seletor-versao"
      rotulo="Dataset e versão"
      valor={versaoId}
      opcoes={opcoes.map(({ id, rotulo, situacao }) => ({
        value: id,
        label: situacao === "privado" ? `${rotulo}${SUFIXO_PRIVADO}` : rotulo,
      }))}
      onChange={handleTrocar}
    />
  )
}
