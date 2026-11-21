import "server-only"

import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { eq } from "drizzle-orm"

import { confirmarImportacao } from "@/lib/server/datasets/importacao-servico"
import { publicarVersao } from "@/lib/server/datasets/publicacao-servico"
import type { Executor } from "@/lib/server/db/cliente"
import { dataset } from "@/lib/server/db/schema"
import { ErroApi } from "@/lib/server/http/erro-api"
import { log } from "@/lib/server/log"

// O CSV vive no repositório e o `Dockerfile` o copia para o runtime; o caminho parte do diretório de execução, que no
// container é a raiz do standalone (PR-13).
export const CAMINHO_DO_PRE_CARREGADO = join(
  "dados",
  "sinteticos",
  "saude-pre-carregado_DEMO.csv"
)

const AUTOR_DA_CARGA = { usuario: "sistema", nome: "Carga da demonstração" }

const METADADOS = {
  nome: "Casos de saúde 2024-2026 (exemplo)",
  indicador: "Casos notificados (sintético)",
  fonte: "Dado sintético da demonstração",
}

const CODIGO_VIOLACAO_DE_UNICIDADE = "23505"

function ehViolacaoDoPreCarregado(erro: unknown): boolean {
  // O Drizzle embrulha o erro do driver em `cause`; o do `pg` traz o código e o nome da restrição.
  const candidatos = [erro, erro instanceof Error ? erro.cause : undefined]
  return candidatos.some(
    (candidato) =>
      typeof candidato === "object" &&
      candidato !== null &&
      "code" in candidato &&
      candidato.code === CODIGO_VIOLACAO_DE_UNICIDADE &&
      "constraint" in candidato &&
      candidato.constraint === "dataset_pre_carregado_unico"
  )
}

async function jaExistePreCarregado(banco: Executor): Promise<boolean> {
  const [existente] = await banco
    .select({ id: dataset.id })
    .from(dataset)
    .where(eq(dataset.preCarregado, true))
    .limit(1)
  return existente !== undefined
}

// Passa pelo mesmo motor da importação do analista (DEC-T-09): se o CSV deixar de passar nas regras, a carga falha em
// vez de gravar dado que a demo não aceitaria. Tudo na mesma transação: ou o pré-carregado nasce publicado, ou nada.
async function criarPreCarregado(banco: Executor, agora: Date): Promise<void> {
  const bytes = new Uint8Array(
    await readFile(join(process.cwd(), CAMINHO_DO_PRE_CARREGADO))
  )
  await banco.transaction(async (transacao) => {
    const { datasetId, versaoId } = await confirmarImportacao(transacao, {
      arquivo: { nome: "saude-pre-carregado_DEMO.csv", bytes },
      dados: {
        separador: ";",
        mapeamento: { bairro: 0, periodo: 1, casos: 2 },
        decisoes: [],
        metadados: METADADOS,
        destino: { tipo: "novo" },
      },
      autor: AUTOR_DA_CARGA,
      agora,
    })
    await transacao
      .update(dataset)
      .set({ preCarregado: true })
      .where(eq(dataset.id, datasetId))
    await publicarVersao(transacao, versaoId, agora)
  })
}

/**
 * Garante o dataset de exemplo publicado (RF-02.41): grava na primeira vez e não faz nada nas seguintes, então a subida
 * e o reset podem chamá-la sempre. Duas instâncias subindo juntas: a que perde a corrida também devolve `existente`.
 */
export async function garantirDatasetPreCarregado(
  banco: Executor,
  agora: Date
): Promise<"criado" | "existente"> {
  if (await jaExistePreCarregado(banco)) return "existente"
  try {
    await criarPreCarregado(banco, agora)
  } catch (erro) {
    // A instância que perde a corrida esbarra no hash do conteúdo (ou, mais raro, no índice do pré-carregado); se o
    // pré-carregado existe agora, o resultado é o mesmo. Se não existe (outro dataset já usa o hash), a falha é real.
    const perdeuACorrida =
      ehViolacaoDoPreCarregado(erro) ||
      (erro instanceof ErroApi && erro.code === "CONTEUDO_JA_IMPORTADO")
    if (!perdeuACorrida || !(await jaExistePreCarregado(banco))) throw erro
    return "existente"
  }
  return "criado"
}

/** Registra o resultado da carga (TechSpec §10): quem chama decide se uma falha derruba algo; aqui só se registra. */
export async function garantirPreCarregadoRegistrando(
  banco: Executor,
  agora: Date
): Promise<void> {
  try {
    const resultado = await garantirDatasetPreCarregado(banco, agora)
    log.info("demo.pre_carregado", { resultado })
  } catch (erro) {
    log.error("demo.pre_carregado", { erro })
  }
}
