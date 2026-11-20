import type { Metadata } from "next"
import Link from "next/link"

import { EstadoInterface } from "@/components/estados/estado-interface"
import { buttonVariants } from "@/components/ui/button"

export const metadata: Metadata = { title: "Página não encontrada" }

// 404 dentro do layout raiz: o selo e o menu continuam visíveis (CA-00.13).
export default function NaoEncontrada() {
  return (
    <EstadoInterface
      tipo="vazio"
      nivelTitulo={1}
      titulo="Página não encontrada"
      descricao="O endereço não existe ou foi alterado. Volte ao início para continuar."
      acao={
        <Link href="/" className={buttonVariants()}>
          Voltar ao início
        </Link>
      }
    />
  )
}
