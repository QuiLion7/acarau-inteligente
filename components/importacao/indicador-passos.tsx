import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

type Passo = { id: string; rotulo: string }

type IndicadorPassosProps = {
  passos: readonly Passo[]
  atual: string
}

// Lista ordenada com `aria-current="step"` no passo atual: o leitor de tela anuncia "passo atual" sem depender da cor.
export function IndicadorPassos({ passos, atual }: IndicadorPassosProps) {
  const indiceAtual = passos.findIndex(({ id }) => id === atual)

  return (
    <ol
      aria-label="Passos da importação"
      className="flex flex-wrap gap-x-6 gap-y-2 text-sm"
    >
      {passos.map(({ id, rotulo }, indice) => {
        const concluido = indice < indiceAtual
        const emAndamento = indice === indiceAtual
        return (
          <li
            key={id}
            aria-current={emAndamento ? "step" : undefined}
            className={cn(
              "flex items-center gap-2",
              emAndamento ? "font-semibold" : "text-muted-foreground"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-xs tabular-nums",
                emAndamento &&
                  "border-primary bg-primary text-primary-foreground",
                concluido && "border-primary text-primary"
              )}
            >
              {concluido ? <Check className="size-3.5" /> : indice + 1}
            </span>
            <span>{rotulo}</span>
            {concluido ? <span className="sr-only">(concluído)</span> : null}
          </li>
        )
      })}
    </ol>
  )
}
