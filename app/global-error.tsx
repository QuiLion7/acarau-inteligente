"use client"

import "./globals.css"
import Link from "next/link"

import { ErroInesperado } from "@/components/estados/erro-inesperado"
import { SeloDemonstracao } from "@/components/casca/selo-demonstracao"
import { NOME_PRODUTO } from "@/lib/config/textos-demonstracao"

// Substitui o layout raiz quando ele mesmo falha, por isso traz `<html>`, estilos e o selo próprios (RN-00.05).
export default function ErroGlobal({
  error,
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  return (
    <html lang="pt-BR" className="font-sans antialiased">
      <body>
        <header className="border-b bg-background">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <Link href="/" className="text-lg font-semibold text-primary">
              {NOME_PRODUTO}
            </Link>
            <SeloDemonstracao />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8">
          <title>Algo deu errado</title>
          <ErroInesperado error={error} retry={retry} />
        </main>
      </body>
    </html>
  )
}
