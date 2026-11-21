"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { datasetsClient } from "@/lib/api/datasets-client"

export const datasetsQueryKeys = {
  all: ["datasets"] as const,
  lista: () => [...datasetsQueryKeys.all, "lista"] as const,
  relatorio: (versaoId: string) =>
    [...datasetsQueryKeys.all, "relatorio", versaoId] as const,
}

export function useDatasets() {
  return useQuery({
    queryKey: datasetsQueryKeys.lista(),
    queryFn: datasetsClient.listar,
  })
}

// `versaoId` nulo = relatório fechado: a query só existe enquanto há uma versão aberta.
export function useRelatorio(versaoId: string | null) {
  return useQuery({
    queryKey: datasetsQueryKeys.relatorio(versaoId ?? ""),
    queryFn: () => datasetsClient.relatorio(versaoId ?? ""),
    enabled: versaoId !== null,
  })
}

// Publicar e despublicar mudam a situação de versões do mesmo dataset: a lista toda é relida.
function useAlterarPublicacao(
  acao: (versaoId: string) => Promise<unknown>,
  mensagem: string
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: acao,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.all })
      toast.success(mensagem)
    },
    onError: (erro) => toast.error(erro.message),
  })
}

export function usePublicar() {
  return useAlterarPublicacao(datasetsClient.publicar, "Versão publicada.")
}

export function useDespublicar() {
  return useAlterarPublicacao(
    datasetsClient.despublicar,
    "Versão despublicada."
  )
}
