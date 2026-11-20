"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

import {
  MUNICIPIO,
  RECORTE_TERRITORIAL,
} from "@/lib/config/textos-demonstracao"
import {
  comFiltros,
  lerFiltros,
  resolverBairro,
  TODOS,
  type SelecaoBairro,
} from "@/lib/filtros/filtros-url"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"

const NAO_RECONHECIDO = "Não reconhecido"

// Nunca devolve o texto bruto da URL: bairro desconhecido vira "Não reconhecido" (RF-01.24).
function rotuloDoBairro(selecao: SelecaoBairro): string {
  if (selecao.tipo === "bairro") return selecao.bairro.nome
  return selecao.tipo === "todos" ? TODOS : NAO_RECONHECIDO
}

// Mostra o contexto da consulta e os filtros globais lidos da URL (RF-00.13, RF-00.14).
export function FaixaContexto({
  bairros,
}: {
  bairros: readonly BairroResumo[]
}) {
  const filtros = lerFiltros(useSearchParams())
  const selecao = resolverBairro(filtros, bairros)
  const contexto = [
    { rotulo: "Município", valor: MUNICIPIO },
    { rotulo: "Recorte", valor: RECORTE_TERRITORIAL },
    { rotulo: "Bairro", valor: rotuloDoBairro(selecao) },
    { rotulo: "Período", valor: filtros.periodo },
  ]

  return (
    <section
      aria-label="Contexto da consulta"
      className="border-b bg-muted/50 text-sm"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2">
        <dl className="flex flex-wrap gap-x-6 gap-y-1">
          {contexto.map(({ rotulo, valor }) => (
            <div key={rotulo} className="flex gap-1.5">
              <dt className="text-muted-foreground">{rotulo}:</dt>
              <dd className="font-medium">{valor}</dd>
            </div>
          ))}
        </dl>
        <Link
          href={comFiltros("/fontes", filtros)}
          className="rounded-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Fontes e limitações
        </Link>
      </div>
    </section>
  )
}
