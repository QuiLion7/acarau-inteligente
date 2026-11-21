"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button, buttonVariants } from "@/components/ui/button"
import { useDespublicar, usePublicar } from "@/hooks/query/use-datasets"
import type { AnaliseDatasetSaude } from "@/lib/saude/analise-dataset"

type AcoesAnalistaProps = {
  versao: Pick<AnaliseDatasetSaude["versao"], "id" | "situacao">
}

// Ações de quem gerencia datasets (RF-02.24, RF-02.26): só analista e administrador as veem, e o servidor confere o
// papel de qualquer jeito. Depois de publicar ou despublicar a página é relida, porque a Saúde é do servidor.
export function AcoesAnalista({ versao }: AcoesAnalistaProps) {
  const router = useRouter()
  const publicar = usePublicar()
  const despublicar = useDespublicar()
  const publicado = versao.situacao === "publicado"
  const alteracao = publicado ? despublicar : publicar

  function handleAlterarPublicacao() {
    alteracao.mutate(versao.id, { onSuccess: () => router.refresh() })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant={publicado ? "outline" : "default"}
        disabled={alteracao.isPending}
        onClick={handleAlterarPublicacao}
      >
        {publicado ? "Despublicar esta versão" : "Publicar esta versão"}
      </Button>
      <Link
        href="/saude/importar"
        className={buttonVariants({ variant: "outline" })}
      >
        Importar CSV
      </Link>
      <Link
        href="/saude/datasets"
        className={buttonVariants({ variant: "outline" })}
      >
        Datasets
      </Link>
    </div>
  )
}
