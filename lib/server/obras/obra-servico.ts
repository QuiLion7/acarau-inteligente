import "server-only"

import { count, eq } from "drizzle-orm"

import type { SessaoValida } from "@/lib/auth/papeis"
import { TEXTOS_OBRAS } from "@/lib/config/textos-obras"
import {
  localizarObra,
  type LocalizacaoCalculada,
} from "@/lib/obras/localizacao-obra"
import type { DadosTerritorio } from "@/lib/territorio/artefato-schema"
import type { Executor, Transacao } from "@/lib/server/db/cliente"
import { obra, obraHistorico } from "@/lib/server/db/schema"
import { ErroApi } from "@/lib/server/http/erro-api"
import { obterObra } from "@/lib/server/obras/obra-repositorio"
import {
  idObraSchema,
  type Obra,
  type ObraEntrada,
} from "@/lib/validations/obra-schema"

/** Teto da demo (PR-03): protege o volume da lista e do mapa, não é regra de negócio. */
export const LIMITE_OBRAS = 200

export type ContextoEscritaObra = {
  autor: SessaoValida
  agora: Date
  territorio: DadosTerritorio
}

type LocalizacaoGravavel = Exclude<
  LocalizacaoCalculada,
  { estado: "fora-do-limite" }
>

/** Bairro sempre recalculado aqui a partir do ponto, ignorando qualquer bairro enviado (RN-04.08, DV-41). */
function localizarParaGravar(
  entrada: ObraEntrada,
  { territorio }: ContextoEscritaObra
): LocalizacaoGravavel {
  const localizacao = localizarObra(entrada.localizacao, {
    limite: territorio.limite.geometria.coordinates,
    bairros: territorio.bairros,
  })
  if (localizacao.estado === "fora-do-limite") {
    throw new ErroApi("VALIDACAO", {
      details: {
        campos: { localizacao: TEXTOS_OBRAS.localizacao.foraDoMunicipio },
      },
    })
  }
  return localizacao
}

function colunasDaEntrada(
  entrada: ObraEntrada,
  localizacao: LocalizacaoGravavel
) {
  return {
    titulo: entrada.titulo,
    descricao: entrada.descricao,
    categoria: entrada.categoria,
    secretaria: entrada.secretaria,
    situacao: entrada.situacao,
    dataInicio: entrada.dataInicio,
    dataPrevista: entrada.dataPrevista,
    valorPrevistoCentavos: entrada.valorPrevistoCentavos,
    longitude: entrada.localizacao?.longitude ?? null,
    latitude: entrada.localizacao?.latitude ?? null,
    estadoLocalizacao: localizacao.estado,
    bairroId:
      localizacao.estado === "dentro-de-bairro" ? localizacao.bairroId : null,
  }
}

async function lerObraGravada(leitor: Executor, id: string): Promise<Obra> {
  const gravada = await obterObra(leitor, id)
  // Acabou de ser gravada na mesma transação: só some se algo apagar a linha no meio.
  if (!gravada) throw new ErroApi("NAO_ENCONTRADO")
  return gravada
}

/**
 * Cria a obra e a entrada inicial do histórico numa transação (RF-04.21, RF-04.26). Ponto fora do município é
 * `VALIDACAO` em `campos.localizacao`; com `LIMITE_OBRAS` obras já gravadas, `LIMITE_OBRAS`. O teto conta sem trava
 * (R-05): dois cadastros simultâneos no limite podem passar dele por uma obra.
 */
export async function criarObra(
  banco: Executor,
  entrada: ObraEntrada,
  contexto: ContextoEscritaObra
): Promise<Obra> {
  const localizacao = localizarParaGravar(entrada, contexto)
  return banco.transaction(async (transacao) => {
    const [{ total }] = await transacao.select({ total: count() }).from(obra)
    if (total >= LIMITE_OBRAS) throw new ErroApi("LIMITE_OBRAS")

    const { autor, agora } = contexto
    const [criada] = await transacao
      .insert(obra)
      .values({
        ...colunasDaEntrada(entrada, localizacao),
        criadoPor: autor.usuario,
        criadoEm: agora,
        atualizadoPor: autor.usuario,
        atualizadoEm: agora,
      })
      .returning({ id: obra.id })
    await transacao.insert(obraHistorico).values({
      obraId: criada.id,
      situacaoAnterior: null,
      situacaoNova: entrada.situacao,
      autorNome: autor.nome,
      registradoEm: agora,
    })
    return lerObraGravada(transacao, criada.id)
  })
}

async function travarObra(transacao: Transacao, id: string) {
  const [atual] = await transacao
    .select({ situacao: obra.situacao })
    .from(obra)
    .where(eq(obra.id, id))
    .for("update")
  if (!atual) throw new ErroApi("NAO_ENCONTRADO")
  return atual
}

/**
 * Substitui os campos editáveis (DEC-T-06). Lê a obra com `for update`: dois saves simultâneos se enfileiram, vale o
 * último e o histórico registra as duas mudanças (PR-04). Só mudança de situação gera entrada no histórico (RN-04.10).
 */
export async function editarObra(
  banco: Executor,
  id: string,
  entrada: ObraEntrada,
  contexto: ContextoEscritaObra
): Promise<{ obra: Obra; situacaoAlterada: boolean }> {
  // Id mal formado responde como inexistente: não revela o formato esperado.
  if (!idObraSchema.safeParse(id).success) throw new ErroApi("NAO_ENCONTRADO")
  const localizacao = localizarParaGravar(entrada, contexto)
  return banco.transaction(async (transacao) => {
    const atual = await travarObra(transacao, id)
    const { autor, agora } = contexto
    await transacao
      .update(obra)
      .set({
        ...colunasDaEntrada(entrada, localizacao),
        atualizadoPor: autor.usuario,
        atualizadoEm: agora,
      })
      .where(eq(obra.id, id))
    const situacaoAlterada = atual.situacao !== entrada.situacao
    if (situacaoAlterada) {
      await transacao.insert(obraHistorico).values({
        obraId: id,
        situacaoAnterior: atual.situacao,
        situacaoNova: entrada.situacao,
        autorNome: autor.nome,
        registradoEm: agora,
      })
    }
    return { obra: await lerObraGravada(transacao, id), situacaoAlterada }
  })
}
