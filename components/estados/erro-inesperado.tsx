"use client"

import Link from "next/link"

import { EstadoInterface } from "@/components/estados/estado-interface"
import { Button, buttonVariants } from "@/components/ui/button"

type ErroInesperadoProps = {
  error: unknown
  retry: () => void
}

// O digest é um identificador opaco que casa com o log do servidor; mensagem e stack nunca vão à tela (RF-00.16).
function digestDoErro(erro: unknown): string | undefined {
  if (typeof erro !== "object" || erro === null || !("digest" in erro))
    return undefined
  return typeof erro.digest === "string" ? erro.digest : undefined
}

// Conteúdo comum de `error.tsx` e `global-error.tsx`: mensagem pt-BR, nova tentativa e caminho de volta.
export function ErroInesperado({ error, retry }: ErroInesperadoProps) {
  const digest = digestDoErro(error)

  return (
    <EstadoInterface
      tipo="erro"
      nivelTitulo={1}
      titulo="Algo deu errado"
      descricao={
        digest
          ? `Ocorreu um problema inesperado. Código de referência: ${digest}.`
          : "Ocorreu um problema inesperado. Tente novamente em instantes."
      }
      acao={
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => retry()}>Tentar novamente</Button>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Voltar ao início
          </Link>
        </div>
      }
    />
  )
}
