"use client"

import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { obrasClient } from "@/lib/api/obras-client"
import { TEXTOS_OBRAS } from "@/lib/config/textos-obras"
import type { ObraEntrada } from "@/lib/validations/obra-schema"

type SalvarObra = {
  /** `null` cria; um id edita (substituição completa, DEC-T-06). */
  obraId: string | null
  entrada: ObraEntrada
}

// Salvar obra (RF-04.23): a resposta é o dado final, então não há query a invalidar; as páginas do servidor (Obras,
// Fontes) são relidas e a lista, o mapa e o resumo se atualizam sem recarregar. Erro fica na mutation: o formulário
// o mostra junto ao campo ou como aviso, mantendo o digitado (RF-04.24).
export function useSalvarObra() {
  const router = useRouter()
  return useMutation({
    mutationFn: ({ obraId, entrada }: SalvarObra) =>
      obraId === null
        ? obrasClient.criar(entrada)
        : obrasClient.editar(obraId, entrada),
    onSuccess: () => {
      router.refresh()
      toast.success(TEXTOS_OBRAS.obraSalva)
    },
  })
}
