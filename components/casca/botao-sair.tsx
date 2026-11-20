"use client"

import { Button } from "@/components/ui/button"
import { useSair } from "@/hooks/query/use-auth"

export function BotaoSair() {
  const sair = useSair()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={sair.isPending}
      onClick={() => sair.mutate()}
    >
      Sair
    </Button>
  )
}
