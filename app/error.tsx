"use client"

import { ErroInesperado } from "@/components/estados/erro-inesperado"

// Erro de render de uma rota: o layout (selo, menu) continua na tela (RF-00.16).
export default function ErroDaRota({
  error,
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  return <ErroInesperado error={error} retry={retry} />
}
