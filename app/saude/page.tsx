import type { Metadata } from "next"

import { PaginaEmBreve } from "@/components/estados/pagina-em-breve"
import { moduloPorId } from "@/lib/config/modulos"

const modulo = moduloPorId("saude")

export const metadata: Metadata = { title: modulo.rotulo }

export default function PaginaSaude() {
  return <PaginaEmBreve modulo={modulo} />
}
