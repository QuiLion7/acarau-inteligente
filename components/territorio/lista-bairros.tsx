"use client"

import { useState } from "react"

import { EstadoInterface } from "@/components/estados/estado-interface"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { TEXTOS_TERRITORIO } from "@/lib/config/textos-territorio"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"
import { buscarBairros } from "@/lib/territorio/busca-bairros"
import { flexionar } from "@/lib/territorio/formato"
import { cn } from "@/lib/utils"

type ListaBairrosProps = {
  bairros: readonly BairroResumo[]
  selecionadoId: string | null
  onSelecionar: (idBairro: string) => void
}

// Busca e lista de bairros (RF-01.15, RF-01.16): botões nativos, então o teclado seleciona sem o mapa.
export function ListaBairros({
  bairros,
  selecionadoId,
  onSelecionar,
}: ListaBairrosProps) {
  const [termo, setTermo] = useState("")
  const encontrados = buscarBairros(bairros, termo)

  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="busca-bairro">Buscar bairro</FieldLabel>
        <Input
          id="busca-bairro"
          type="search"
          autoComplete="off"
          placeholder="Nome ou código da UV"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
        />
      </Field>
      <p role="status" className="text-sm text-muted-foreground">
        {flexionar(
          encontrados.length,
          "bairro encontrado",
          "bairros encontrados"
        )}
      </p>
      {encontrados.length === 0 ? (
        <EstadoInterface
          tipo="fora-da-cobertura"
          titulo="Nenhum bairro encontrado"
          descricao={TEXTOS_TERRITORIO.coberturaDemonstracao}
        />
      ) : (
        <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
          {encontrados.map((bairro) => {
            const selecionado = bairro.id === selecionadoId
            return (
              <li key={bairro.id}>
                <button
                  type="button"
                  aria-current={selecionado ? "true" : undefined}
                  onClick={() => onSelecionar(bairro.id)}
                  className={cn(
                    "flex w-full items-baseline gap-2 rounded-lg px-3 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    selecionado && "bg-primary/10 font-medium text-primary"
                  )}
                >
                  <span className="text-xs text-muted-foreground tabular-nums">
                    UV {bairro.uv}
                  </span>
                  {bairro.nome}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
