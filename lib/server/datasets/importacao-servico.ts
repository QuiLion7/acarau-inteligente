import "server-only"

import { createHash, randomUUID } from "node:crypto"

import { eq, max } from "drizzle-orm"

import {
  analisarImportacao,
  ehConfirmavel,
} from "@/lib/importacao/analisar-importacao"
import { lerArquivoCsv } from "@/lib/importacao/ler-arquivo-csv"
import { montarRelatorio } from "@/lib/importacao/montar-relatorio"
import type {
  AnaliseConfirmavel,
  ArquivoLido,
  RecusaArquivo,
} from "@/lib/importacao/tipos-importacao"
import { TEXTOS_SAUDE } from "@/lib/config/textos-saude"
import {
  buscarVersaoPorHash,
  type ReferenciaVersao,
} from "@/lib/server/datasets/dataset-repositorio"
import { gravarLinhasEmLotes } from "@/lib/server/datasets/dataset-linha-repositorio"
import type { Executor, Transacao } from "@/lib/server/db/cliente"
import { dataset, datasetVersao } from "@/lib/server/db/schema"
import { ErroApi } from "@/lib/server/http/erro-api"
import { listarResumoBairros } from "@/lib/server/territorio/territorio-repositorio"
import type { ConfirmarImportacao } from "@/lib/validations/importacao-schema"

const PROVENIENCIA = "SINTETICO"
const UNIDADE = "casos"
const CODIGO_VIOLACAO_DE_UNICIDADE = "23505"
const RESTRICAO_DO_HASH = "dataset_versao_hash_conteudo_unico"
const NOME_ARQUIVO_MAXIMO = 255
// O 422 devolve só o começo dos problemas: um arquivo de 10.000 linhas ruins não vira uma resposta gigante.
const PROBLEMAS_NO_ERRO = 100

export type EntradaConfirmacao = {
  arquivo: { nome: string; bytes: Uint8Array }
  dados: ConfirmarImportacao
  autor: { usuario: string; nome: string }
  agora: Date
}

export type ImportacaoGravada = {
  datasetId: string
  versaoId: string
  numero: number
  linhasGravadas: number
}

type ArquivoAnalisado = {
  arquivo: ArquivoLido
  analise: AnaliseConfirmavel
}

function detalhesDaRecusa({ motivo, linha, coluna }: RecusaArquivo) {
  return { recusa: { motivo, linha, coluna } }
}

// Roda o mesmo motor do assistente, sobre os bytes recebidos e com os mesmos 24 bairros (DEC-T-01, R-01). Qualquer
// recusa, erro ou nome sem decisão é 422: o cliente só envia com `podeConfirmar`, então isto protege contra divergência
// e contra requisição direta (TechSpec §5).
function analisarBytesRecebidos(entrada: EntradaConfirmacao): ArquivoAnalisado {
  const { arquivo, dados } = entrada
  const leitura = lerArquivoCsv({
    nome: arquivo.nome,
    bytes: arquivo.bytes,
    separador: dados.separador,
  })
  if (leitura.status === "recusado") {
    if (leitura.motivo === "ARQUIVO_GRANDE_DEMAIS") {
      throw new ErroApi("ARQUIVO_GRANDE_DEMAIS")
    }
    throw new ErroApi("IMPORTACAO_INVALIDA", {
      details: detalhesDaRecusa(leitura),
    })
  }
  const analise = analisarImportacao({
    arquivo: leitura.arquivo,
    mapeamento: dados.mapeamento,
    decisoes: dados.decisoes,
    bairros: listarResumoBairros(),
  })
  if (!ehConfirmavel(analise)) {
    throw new ErroApi("IMPORTACAO_INVALIDA", {
      details: {
        problemas: analise.problemas.slice(0, PROBLEMAS_NO_ERRO),
        pendencias: analise.pendencias,
      },
    })
  }
  const nome = leitura.arquivo.nome.slice(0, NOME_ARQUIVO_MAXIMO)
  return { arquivo: { ...leitura.arquivo, nome }, analise }
}

function calcularHash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex")
}

function ehViolacaoDoHash(erro: unknown): boolean {
  // O Drizzle embrulha o erro do driver em `cause`; o do `pg` traz `code` e o nome da restrição.
  const candidatos = [erro, erro instanceof Error ? erro.cause : undefined]
  return candidatos.some(
    (candidato) =>
      typeof candidato === "object" &&
      candidato !== null &&
      "code" in candidato &&
      candidato.code === CODIGO_VIOLACAO_DE_UNICIDADE &&
      "constraint" in candidato &&
      candidato.constraint === RESTRICAO_DO_HASH
  )
}

function erroDeConteudoJaImportado(
  existente: ReferenciaVersao | null
): ErroApi {
  if (!existente) return new ErroApi("CONTEUDO_JA_IMPORTADO")
  const { datasetId, nome, numero } = existente
  return new ErroApi("CONTEUDO_JA_IMPORTADO", {
    message: TEXTOS_SAUDE.jaImportado(nome, numero),
    details: { datasetId, nome, numero },
  })
}

type DestinoGravado = { datasetId: string; numero: number }

// Dataset novo, ou nova versão de um existente (RF-02.22). A nova versão trava o dataset (`for update`) para o
// `max + 1` não repetir número quando duas importações chegam juntas.
async function prepararDestino(
  transacao: Transacao,
  { dados, agora }: Pick<EntradaConfirmacao, "dados" | "agora">
): Promise<DestinoGravado> {
  if (dados.destino.tipo === "novo") {
    const datasetId = randomUUID()
    await transacao.insert(dataset).values({
      id: datasetId,
      ...dados.metadados,
      unidade: UNIDADE,
      proveniencia: PROVENIENCIA,
      criadoEm: agora,
    })
    return { datasetId, numero: 1 }
  }

  const { datasetId } = dados.destino
  const [existente] = await transacao
    .select({ id: dataset.id })
    .from(dataset)
    .where(eq(dataset.id, datasetId))
    .for("update")
  if (!existente) throw new ErroApi("NAO_ENCONTRADO")
  const [ultima] = await transacao
    .select({ maior: max(datasetVersao.numero) })
    .from(datasetVersao)
    .where(eq(datasetVersao.datasetId, datasetId))
  return { datasetId, numero: (ultima?.maior ?? 0) + 1 }
}

async function gravarImportacao(
  transacao: Transacao,
  entrada: EntradaConfirmacao,
  { arquivo, analise }: ArquivoAnalisado,
  hashConteudo: string
): Promise<ImportacaoGravada> {
  const { datasetId, numero } = await prepararDestino(transacao, entrada)
  const versaoId = randomUUID()
  const linhasGravadas = analise.linhasNormalizadas.length
  await transacao.insert(datasetVersao).values({
    id: versaoId,
    datasetId,
    numero,
    // Nasce privada: publicar é ação explícita (RF-02.24).
    situacao: "privado",
    granularidade: analise.granularidade,
    periodos: analise.periodos,
    hashConteudo,
    nomeArquivo: arquivo.nome,
    autorUsuario: entrada.autor.usuario,
    autorNome: entrada.autor.nome,
    linhasGravadas,
    importadoEm: entrada.agora,
    relatorio: montarRelatorio({
      arquivo,
      analise,
      hashConteudo,
      bairros: listarResumoBairros(),
    }),
  })
  await gravarLinhasEmLotes(transacao, versaoId, analise.linhasNormalizadas)
  return { datasetId, versaoId, numero, linhasGravadas }
}

/**
 * Confirma a importação (RF-02.19 a RF-02.22): roda o motor, calcula o SHA-256 dos bytes e grava dataset (ou nova
 * versão), versão privada, linhas e relatório numa transação só. O mesmo conteúdo nunca é gravado duas vezes:
 * `CONTEUDO_JA_IMPORTADO` vale também na corrida da confirmação dupla (a violação do índice único vira o mesmo erro).
 */
export async function confirmarImportacao(
  banco: Executor,
  entrada: EntradaConfirmacao
): Promise<ImportacaoGravada> {
  const analisado = analisarBytesRecebidos(entrada)
  const hashConteudo = calcularHash(entrada.arquivo.bytes)

  const jaImportado = await buscarVersaoPorHash(banco, hashConteudo)
  if (jaImportado) throw erroDeConteudoJaImportado(jaImportado)

  try {
    return await banco.transaction((transacao) =>
      gravarImportacao(transacao, entrada, analisado, hashConteudo)
    )
  } catch (erro) {
    if (!ehViolacaoDoHash(erro)) throw erro
    throw erroDeConteudoJaImportado(
      await buscarVersaoPorHash(banco, hashConteudo)
    )
  }
}
