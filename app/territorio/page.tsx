import type { Metadata } from "next"

import { PaginaEmBreve } from "@/components/estados/pagina-em-breve"
import { moduloPorId } from "@/lib/config/modulos"

const modulo = moduloPorId("territorio")

export const metadata: Metadata = { title: modulo.rotulo }

export default function PaginaTerritorio() {
  return <PaginaEmBreve modulo={modulo} />
}
