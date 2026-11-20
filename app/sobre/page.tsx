import type { Metadata } from "next"
import Link from "next/link"

import {
  AVISO_DEMONSTRACAO,
  DESCRICAO_PRODUTO,
} from "@/lib/config/textos-demonstracao"

export const metadata: Metadata = { title: "Sobre a demonstração" }

// Aviso completo de demonstração (RF-00.10), alcançável pelo selo de toda tela.
export default function PaginaSobre() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        Sobre a demonstração
      </h1>
      <section
        aria-labelledby="aviso"
        className="flex flex-col gap-2 rounded-xl border border-primary/40 bg-primary/5 p-4"
      >
        <h2 id="aviso" className="font-semibold text-primary">
          Aviso
        </h2>
        <p>{AVISO_DEMONSTRACAO}</p>
      </section>
      <section aria-labelledby="o-que-e" className="flex flex-col gap-2">
        <h2 id="o-que-e" className="text-xl font-semibold">
          O que é
        </h2>
        <p>{DESCRICAO_PRODUTO}</p>
      </section>
      <p>
        A procedência de cada camada de dados está em{" "}
        <Link
          href="/fontes"
          className="text-primary underline underline-offset-4"
        >
          Fontes e limitações
        </Link>
        .
      </p>
    </div>
  )
}
