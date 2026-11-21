"use client"

import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useReiniciarDemo } from "@/hooks/query/use-demo"
import { TEXTOS_SAUDE } from "@/lib/config/textos-saude"

// Reinício da demonstração (RF-02.43, PA-02.03): ação destrutiva, então pede confirmação com o que será apagado.
// O servidor confere que é administrador; esconder o botão de quem não é só poupa o clique.
export function ReiniciarDemo() {
  const [aberto, setAberto] = useState(false)
  const reiniciar = useReiniciarDemo()

  function handleConfirmar() {
    reiniciar.mutate(undefined, { onSettled: () => setAberto(false) })
  }

  return (
    <section aria-labelledby="titulo-reiniciar" className="flex flex-col gap-3">
      <h2 id="titulo-reiniciar" className="text-xl font-semibold">
        Reiniciar a demonstração
      </h2>
      <p className="max-w-prose text-muted-foreground">{TEXTOS_SAUDE.reset}</p>
      <AlertDialog open={aberto} onOpenChange={setAberto}>
        <AlertDialogTrigger
          render={<Button variant="outline" className="w-fit" />}
        >
          Reiniciar a demonstração
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reiniciar a demonstração?</AlertDialogTitle>
            <AlertDialogDescription>
              {TEXTOS_SAUDE.reset}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={reiniciar.isPending}
              onClick={handleConfirmar}
            >
              {reiniciar.isPending ? "Reiniciando..." : "Reiniciar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
