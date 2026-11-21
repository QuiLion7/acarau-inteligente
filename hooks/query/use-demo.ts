"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { datasetsQueryKeys } from "@/hooks/query/use-datasets"
import { demoClient } from "@/lib/api/demo-client"

// Depois do reset a lista de datasets do cache já não vale, e as páginas do servidor (Saúde, Fontes) são relidas.
export function useReiniciarDemo() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: demoClient.reiniciar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.all })
      router.refresh()
      toast.success("Demonstração reiniciada.")
    },
    onError: (erro) => toast.error(erro.message),
  })
}
