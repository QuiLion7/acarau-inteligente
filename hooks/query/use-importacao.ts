"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { importacaoClient } from "@/lib/api/importacao-client"
import { datasetsQueryKeys } from "@/hooks/query/use-datasets"

export const importacaoQueryKeys = {
  all: ["importacao"] as const,
  conteudo: (hash: string) =>
    [...importacaoQueryKeys.all, "conteudo", hash] as const,
}

// `hash` nulo = não houve como calcular o SHA-256 (ou não há arquivo): sem consulta, e o servidor ainda decide na
// confirmação (409). O resultado vale só para o hash consultado, então não é reaproveitado depois de gravar.
export function useConteudoImportado(hash: string | null) {
  return useQuery({
    queryKey: importacaoQueryKeys.conteudo(hash ?? ""),
    queryFn: () => importacaoClient.conteudoImportado(hash ?? ""),
    enabled: hash !== null,
    staleTime: 0,
    gcTime: 0,
  })
}

// No sucesso o analista vai à Saúde com a versão recém-gravada, que nasce privada (RF-02.24).
export function useConfirmarImportacao() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: importacaoClient.confirmar,
    onSuccess: async ({ versaoId }) => {
      await queryClient.invalidateQueries({ queryKey: datasetsQueryKeys.all })
      router.push(`/saude?versao=${encodeURIComponent(versaoId)}`)
    },
  })
}
