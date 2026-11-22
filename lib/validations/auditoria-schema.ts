import { z } from "zod"

import {
  TIPOS_EVENTO_AUDITORIA,
  type TipoEventoAuditoria,
} from "@/lib/auditoria/eventos-auditoria"
import {
  CONTA_DESCONHECIDA,
  type FiltrosAuditoria,
} from "@/lib/auditoria/tipos-auditoria"

// Filtros da consulta da auditoria (TechSpec EP-05 §2, RF-05.27): vêm da URL e valor inválido é ignorado (vira `null`
// ou a página 1), nunca erro nem eco do valor.

const PAGINA_MAXIMA = 100_000

function diaValido(valor: string): boolean {
  const data = new Date(`${valor}T00:00:00.000Z`)
  return !Number.isNaN(data.getTime()) && data.toISOString().startsWith(valor)
}

const dia = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(diaValido)

const textoUnico = z.string().min(1).max(64)

const filtrosBrutosSchema = z.object({
  tipo: z.enum(TIPOS_EVENTO_AUDITORIA).nullable().catch(null),
  conta: textoUnico.nullable().catch(null),
  de: dia.nullable().catch(null),
  ate: dia.nullable().catch(null),
  pagina: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(PAGINA_MAXIMA))
    .catch(1),
})

type ParametrosDaUrl = Readonly<
  Record<string, string | readonly string[] | undefined>
>

function primeiroValor(valor: string | readonly string[] | undefined) {
  return (Array.isArray(valor) ? valor[0] : valor) ?? null
}

/**
 * Lê os filtros dos parâmetros da página. `contasDoAmbiente` são os usuários das contas demo: só elas e
 * "desconhecida" valem como conta; qualquer outro texto é ignorado.
 */
export function lerFiltrosAuditoria(
  parametros: ParametrosDaUrl,
  contasDoAmbiente: readonly string[]
): FiltrosAuditoria {
  const lidos = filtrosBrutosSchema.parse({
    tipo: primeiroValor(parametros.tipo),
    conta: primeiroValor(parametros.conta),
    de: primeiroValor(parametros.de),
    ate: primeiroValor(parametros.ate),
    pagina: primeiroValor(parametros.pagina) ?? "1",
  })
  const contaConhecida =
    lidos.conta !== null &&
    (lidos.conta === CONTA_DESCONHECIDA ||
      contasDoAmbiente.includes(lidos.conta))
  return {
    tipo: lidos.tipo as TipoEventoAuditoria | null,
    conta: contaConhecida ? lidos.conta : null,
    de: lidos.de,
    ate: lidos.ate,
    pagina: lidos.pagina,
  }
}

/** Há algum filtro aplicado (a página não conta): decide entre "limpar filtros" e "nenhum evento ainda". */
export function haFiltroDeAuditoria(filtros: FiltrosAuditoria): boolean {
  return (
    filtros.tipo !== null ||
    filtros.conta !== null ||
    filtros.de !== null ||
    filtros.ate !== null
  )
}
