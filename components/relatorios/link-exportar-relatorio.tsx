"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { buttonVariants } from "@/components/ui/button"

const PARAMETROS_DO_RELATORIO = ["bairro", "periodo", "versao"] as const
const ROTULO = "Exportar relatório"

// Leva o filtro da tela ao relatório (RF-05.05, CA-05.02): `bairro`, `periodo` e `versao` da URL atual viram a consulta de
// `/relatorios`. O valor não é interpretado aqui: o servidor do relatório valida cada um de novo (DV-12, DV-25).
export function LinkExportarRelatorio() {
  const parametros = useSearchParams()
  const consulta = new URLSearchParams()
  for (const nome of PARAMETROS_DO_RELATORIO) {
    const valor = parametros.get(nome)
    if (valor) consulta.set(nome, valor)
  }
  const texto = consulta.toString()
  return (
    <Link
      href={texto ? `/relatorios?${texto}` : "/relatorios"}
      className={buttonVariants({ variant: "outline" })}
    >
      {ROTULO}
    </Link>
  )
}
