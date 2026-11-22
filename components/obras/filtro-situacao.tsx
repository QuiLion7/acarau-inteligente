"use client"

import { SimboloObra } from "@/components/obras/simbolo-obra"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { TEXTOS_OBRAS } from "@/lib/config/textos-obras"
import { lerSituacoes } from "@/lib/obras/filtro-obras"
import {
  ROTULO_SITUACAO_OBRA,
  SITUACOES_OBRA,
  type SituacaoObra,
} from "@/lib/obras/situacao-obra"

type FiltroSituacaoProps = {
  situacoes: readonly SituacaoObra[]
  onChange: (situacoes: SituacaoObra[]) => void
}

// Chips de situação (RF-04.05): vários ao mesmo tempo, nenhum marcado = todas. Cada chip tem a forma do marcador
// no mapa e o nome escrito; o estado marcado é `aria-pressed`, lido por leitor de tela.
export function FiltroSituacao({ situacoes, onChange }: FiltroSituacaoProps) {
  return (
    <div
      role="group"
      aria-labelledby="rotulo-situacao"
      className="flex flex-col gap-1.5"
    >
      <span id="rotulo-situacao" className="text-sm font-medium">
        {TEXTOS_OBRAS.filtros.situacao}
      </span>
      <ToggleGroup
        multiple
        variant="outline"
        spacing={1}
        className="flex-wrap"
        value={[...situacoes]}
        // O grupo devolve texto; `lerSituacoes` aceita só as situações do catálogo, sem cast.
        onValueChange={(marcadas) => onChange(lerSituacoes(marcadas.join(",")))}
      >
        {SITUACOES_OBRA.map((situacao) => (
          <ToggleGroupItem key={situacao} value={situacao}>
            <SimboloObra situacao={situacao} />
            {ROTULO_SITUACAO_OBRA[situacao]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
