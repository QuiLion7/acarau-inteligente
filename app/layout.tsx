import type { Metadata } from "next"
import { Geist_Mono, Roboto } from "next/font/google"
import { Suspense } from "react"

import "./globals.css"
import { Cabecalho } from "@/components/casca/cabecalho"
import { FaixaContexto } from "@/components/casca/faixa-contexto"
import { PularParaConteudo } from "@/components/casca/pular-para-conteudo"
import { QueryProvider } from "@/components/providers/query-provider"
import { Toaster } from "@/components/ui/sonner"
import {
  DESCRICAO_PRODUTO,
  NOME_PRODUTO,
  SELO_DEMONSTRACAO,
} from "@/lib/config/textos-demonstracao"
import { cn } from "@/lib/utils"

const roboto = Roboto({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    default: `${NOME_PRODUTO} - ${SELO_DEMONSTRACAO}`,
    template: `%s | ${NOME_PRODUTO}`,
  },
  description: DESCRICAO_PRODUTO,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        roboto.variable
      )}
    >
      <body>
        <QueryProvider>
          <PularParaConteudo />
          <Cabecalho />
          <Suspense fallback={null}>
            <FaixaContexto />
          </Suspense>
          <main
            id="conteudo"
            tabIndex={-1}
            className="mx-auto w-full max-w-6xl px-4 py-8 outline-none"
          >
            {children}
          </main>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  )
}
