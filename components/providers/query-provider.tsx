"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"

const TRINTA_SEGUNDOS_MS = 30_000

function criarQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: TRINTA_SEGUNDOS_MS },
      mutations: { retry: false },
    },
  })
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // Um client por montagem do app no navegador; o estado inicial evita recriá-lo a cada render.
  const [client] = useState(criarQueryClient)
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
