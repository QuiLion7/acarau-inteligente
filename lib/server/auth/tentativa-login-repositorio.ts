import "server-only"

import { and, desc, eq, gte, lt } from "drizzle-orm"

import type { TentativaRecente } from "@/lib/auth/bloqueio-login"
import { obterBanco } from "@/lib/server/db/cliente"
import { tentativaLogin } from "@/lib/server/db/schema"

type NovaTentativa = { usuario: string; sucesso: boolean; ocorridaEm: Date }

export async function registrarTentativa(
  tentativa: NovaTentativa
): Promise<void> {
  await obterBanco().insert(tentativaLogin).values(tentativa)
}

export async function listarTentativasDesde(
  usuario: string,
  desde: Date
): Promise<TentativaRecente[]> {
  return obterBanco()
    .select({
      sucesso: tentativaLogin.sucesso,
      ocorridaEm: tentativaLogin.ocorridaEm,
    })
    .from(tentativaLogin)
    .where(
      and(
        eq(tentativaLogin.usuario, usuario),
        gte(tentativaLogin.ocorridaEm, desde)
      )
    )
    .orderBy(desc(tentativaLogin.ocorridaEm))
}

export async function apagarTentativasAntesDe(limite: Date): Promise<void> {
  await obterBanco()
    .delete(tentativaLogin)
    .where(lt(tentativaLogin.ocorridaEm, limite))
}
