import type { Metadata } from "next"

import { PaginaEmBreve } from "@/components/estados/pagina-em-breve"
import { moduloPorId } from "@/lib/config/modulos"

const modulo = moduloPorId("relatorios")

export const metadata: Metadata = { title: modulo.rotulo }

export default function PaginaRelatorios() {
  return <PaginaEmBreve modulo={modulo} />
}
