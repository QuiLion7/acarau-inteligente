import "server-only"

import { sql, type SQL } from "drizzle-orm"

import { log } from "@/lib/server/log"

// Contrato público (TechSpec §4.7): sem versão, host, usuário, mensagem do driver nem tempo de resposta.
export type EstadoSaude = {
  status: "ok" | "indisponivel"
  componentes: { aplicacao: "ok"; banco: "ok" | "indisponivel" }
}

export const TEMPO_LIMITE_BANCO_MS = 2000

// Só o que a verificação usa do banco: o teste do tempo limite injeta um banco que nunca responde.
type BancoConsultavel = { execute: (consulta: SQL) => PromiseLike<unknown> }

function esperarLimite(): { limite: Promise<never>; cancelar: () => void } {
  let temporizador: NodeJS.Timeout | undefined
  const limite = new Promise<never>((_, rejeitar) => {
    temporizador = setTimeout(
      () => rejeitar(new Error("tempo limite da consulta de saúde excedido")),
      TEMPO_LIMITE_BANCO_MS
    )
  })
  return { limite, cancelar: () => clearTimeout(temporizador) }
}

export async function verificarSaude(
  banco: BancoConsultavel,
  requestId?: string
): Promise<EstadoSaude> {
  const { limite, cancelar } = esperarLimite()
  try {
    await Promise.race([banco.execute(sql`select 1`), limite])
    return {
      status: "ok",
      componentes: { aplicacao: "ok", banco: "ok" },
    }
  } catch (erro) {
    log.warn("saude.banco_indisponivel", { requestId, erro })
    return {
      status: "indisponivel",
      componentes: { aplicacao: "ok", banco: "indisponivel" },
    }
  } finally {
    cancelar()
  }
}
