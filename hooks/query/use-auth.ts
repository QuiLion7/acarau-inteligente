"use client"

import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { authClient } from "@/lib/api/auth-client"

// `retorno` já chega validado por `destinoAposLogin` (a página de login é quem lê a URL).
export function useEntrar(retorno: string) {
  const router = useRouter()
  return useMutation({
    mutationFn: authClient.entrar,
    onSuccess: () => {
      router.replace(retorno)
      // O cabeçalho é Server Component: o refresh o faz reler a sessão.
      router.refresh()
    },
  })
}

export function useSair() {
  const router = useRouter()
  return useMutation({
    mutationFn: authClient.sair,
    onSuccess: () => {
      router.replace("/")
      router.refresh()
      toast.success("Sessão encerrada.")
    },
    onError: (erro) => toast.error(erro.message),
  })
}
