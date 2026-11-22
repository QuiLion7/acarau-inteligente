import { NextRequest } from "next/server"

import { NOME_COOKIE_SESSAO } from "@/lib/auth/nome-cookie-sessao"
import type { SessaoValida } from "@/lib/auth/papeis"
import type { PontoObra } from "@/lib/validations/obra-schema"
import {
  obraEntradaSchema,
  type ObraEntrada,
} from "@/lib/validations/obra-schema"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"
import type { ContextoEscritaObra } from "@/lib/server/obras/obra-servico"
import { ORIGEM_DO_APP } from "@/test/importacao-teste"

// Apoio dos testes de integração de obras: território real do artefato e contas de teste (test.md §8 da TechSpec).

export const AUTOR_ANALISTA: SessaoValida = {
  usuario: "analista-teste",
  nome: "Analista Demo",
  papel: "analista",
}

export const INSTANTE_FIXO = new Date("2026-11-21T14:05:00.000Z")

/** O ponto interior de um bairro do artefato: cai dentro dele pela regra real. */
export function pontoInteriorDoBairro(bairroId: string): PontoObra {
  const bairro = obterDadosTerritorio().bairros.find(
    ({ id }) => id === bairroId
  )
  if (!bairro) throw new Error(`Bairro ${bairroId} ausente do artefato.`)
  const [longitude, latitude] = bairro.pontoInterior
  return { longitude, latitude }
}

/** Dentro do município e fora das 24 UVs (a obra DEMO-07 usa este ponto). */
export const PONTO_FORA_DA_COBERTURA: PontoObra = {
  longitude: -40.14,
  latitude: -2.88,
}

export const PONTO_FORA_DO_LIMITE: PontoObra = {
  longitude: -38.5,
  latitude: -3.7,
}

/** `ObraEntrada` pelo mesmo schema da rota, com título e situação mínimos; cada teste sobrescreve o que importa. */
export function entradaDeObra(
  sobrescritas: Record<string, unknown> = {}
): ObraEntrada {
  return obraEntradaSchema.parse({
    titulo: "DEMO - Obra de teste",
    situacao: "planejada",
    ...sobrescritas,
  })
}

export function contextoDeEscrita(
  sobrescritas: Partial<ContextoEscritaObra> = {}
): ContextoEscritaObra {
  return {
    autor: AUTOR_ANALISTA,
    agora: INSTANTE_FIXO,
    territorio: obterDadosTerritorio(),
    ...sobrescritas,
  }
}

type OpcoesDeRequisicaoJson = {
  metodo: "POST" | "PUT"
  token?: string
  origem?: string | null
  corpo?: unknown
}

/** Requisição JSON a uma rota de obras: cookie de sessão e `Origin` do app, salvo o que o teste trocar. */
export function requisicaoJson(
  caminho: string,
  { metodo, token, origem, corpo }: OpcoesDeRequisicaoJson
): NextRequest {
  const cabecalhos: Record<string, string> = {
    "content-type": "application/json",
  }
  if (token) cabecalhos.cookie = `${NOME_COOKIE_SESSAO}=${token}`
  if (origem !== null) cabecalhos.origin = origem ?? ORIGEM_DO_APP
  return new NextRequest(`${ORIGEM_DO_APP}${caminho}`, {
    method: metodo,
    headers: cabecalhos,
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  })
}
