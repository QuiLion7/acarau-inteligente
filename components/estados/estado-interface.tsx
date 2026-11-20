import type { ReactNode } from "react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import {
  ESTADOS_INTERFACE,
  type TipoEstado,
} from "@/lib/config/estados-interface"

type EstadoInterfaceProps = {
  tipo: TipoEstado
  // Só texto: um número aqui poderia fazer a ausência parecer um dado (RN-014).
  titulo?: string
  descricao?: string
  acao?: ReactNode
  nivelTitulo?: 1 | 2
}

// Único componente de estado de tela (DV-11): o catálogo dá o texto padrão e o chamador só ajusta o que for do contexto.
export function EstadoInterface({
  tipo,
  titulo,
  descricao,
  acao,
  nivelTitulo = 2,
}: EstadoInterfaceProps) {
  const padrao = ESTADOS_INTERFACE[tipo]
  const Icone = padrao.icone
  const Titulo = nivelTitulo === 1 ? "h1" : "h2"

  return (
    <Empty
      role={tipo === "erro" ? "alert" : undefined}
      data-estado={tipo}
      className="border"
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {Icone ? <Icone aria-hidden /> : <Spinner />}
        </EmptyMedia>
        <EmptyTitle>
          <Titulo>{titulo ?? padrao.titulo}</Titulo>
        </EmptyTitle>
        <EmptyDescription>{descricao ?? padrao.descricao}</EmptyDescription>
      </EmptyHeader>
      {acao ? <EmptyContent>{acao}</EmptyContent> : null}
    </Empty>
  )
}
