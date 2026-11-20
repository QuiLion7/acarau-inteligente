import type { Metadata } from "next"

import { PaginaEmBreve } from "@/components/estados/pagina-em-breve"
import { moduloPorId } from "@/lib/config/modulos"

const modulo = moduloPorId("educacao")

export const metadata: Metadata = { title: modulo.rotulo }

export default function PaginaEducacao() {
  return <PaginaEmBreve modulo={modulo} />
}
