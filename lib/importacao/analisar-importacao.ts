import { detectarDuplicatas } from "@/lib/importacao/duplicatas"
import {
  corresponderNome,
  decisaoValida,
  resolverDestino,
} from "@/lib/importacao/correspondencia-bairros"
import {
  escolherMapeamento,
  listarColunasIgnoradas,
  mapeamentoCompleto,
} from "@/lib/importacao/mapeamento-colunas"
import type {
  AnaliseConfirmavel,
  AnaliseImportacao,
  ArquivoLido,
  CodigoProblema,
  DecisaoBairro,
  DestinoNome,
  LinhaNormalizada,
  MapeamentoParcial,
  NomeDistinto,
  ProblemaLinha,
  ResumoAnalise,
} from "@/lib/importacao/tipos-importacao"
import {
  aplicarGranularidade,
  analisarLinha,
  SEVERIDADE_POR_CODIGO,
  type LinhaAnalisada,
} from "@/lib/importacao/validar-linhas"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"

const MARCA_ANALISE = "importacao:analise"

const SEM_PROBLEMAS: Record<CodigoProblema, number> = {
  PERIODO_INVALIDO: 0,
  GRANULARIDADE_MISTURADA: 0,
  CASOS_NEGATIVO: 0,
  CASOS_DECIMAL: 0,
  CASOS_NAO_NUMERICO: 0,
  CASOS_VAZIO: 0,
  BAIRRO_VAZIO: 0,
  DUPLICATA: 0,
}

type EntradaAnalise = {
  arquivo: ArquivoLido
  /** `null` usa a sugestão pelo cabeçalho. */
  mapeamento: MapeamentoParcial | null
  decisoes: readonly DecisaoBairro[]
  /** Os 24 bairros: do `listarResumoBairros()` no servidor e das props no cliente. */
  bairros: readonly BairroResumo[]
}

// Medição de RNF-02.01 no navegador; o jsdom dos testes de interface não implementa `performance.mark`.
function marcarAnalise() {
  if (typeof performance.mark === "function") performance.mark(MARCA_ANALISE)
}

function problemasDasLinhas(
  linhas: readonly LinhaAnalisada[]
): ProblemaLinha[] {
  return linhas.flatMap(({ numero, codigos }) =>
    codigos.map((codigo) => ({
      linhas: [numero],
      codigo,
      severidade: SEVERIDADE_POR_CODIGO[codigo],
    }))
  )
}

// Erros antes de avisos; dentro de cada grupo, pela primeira linha (e pelo código, para a ordem não depender da entrada).
function ordenarProblemas(
  problemas: readonly ProblemaLinha[]
): ProblemaLinha[] {
  const pesoDaSeveridade = { erro: 0, aviso: 1 }
  return problemas.toSorted(
    (a, b) =>
      pesoDaSeveridade[a.severidade] - pesoDaSeveridade[b.severidade] ||
      (a.linhas[0] ?? 0) - (b.linhas[0] ?? 0) ||
      a.codigo.localeCompare(b.codigo)
  )
}

function montarNomes(
  linhas: readonly LinhaAnalisada[],
  decisoes: readonly DecisaoBairro[],
  bairros: readonly BairroResumo[]
): NomeDistinto[] {
  const porNome = new Map<string, { nomeOriginal: string; linhas: number }>()
  for (const { nomeNormalizado, nomeOriginal } of linhas) {
    if (nomeNormalizado === "") continue
    const existente = porNome.get(nomeNormalizado)
    if (existente) existente.linhas += 1
    else porNome.set(nomeNormalizado, { nomeOriginal, linhas: 1 })
  }
  return [...porNome].map(
    ([nomeNormalizado, { nomeOriginal, linhas: total }]) => {
      const correspondencia = corresponderNome(nomeOriginal, bairros)
      // Reconhecido segue sozinho: decisão sobre ele não vale (RF-02.08).
      const decisao =
        correspondencia.estado === "reconhecido"
          ? null
          : decisaoValida(nomeNormalizado, decisoes, bairros)
      return {
        nomeOriginal,
        nomeNormalizado,
        linhas: total,
        correspondencia,
        decisao,
        destino: resolverDestino(correspondencia, decisao),
      }
    }
  )
}

function normalizarLinhas(
  linhas: readonly LinhaAnalisada[],
  destinoPorNome: ReadonlyMap<string, DestinoNome | null>,
  linhasComErro: ReadonlySet<number>
): LinhaNormalizada[] {
  return linhas.flatMap((linha) => {
    const destino = destinoPorNome.get(linha.nomeNormalizado)
    if (linhasComErro.has(linha.numero) || !destino || !linha.periodo) return []
    return [
      {
        linhaArquivo: linha.numero,
        bairroId: destino.tipo === "bairro" ? destino.bairroId : null,
        nomeOriginal: linha.nomeOriginal,
        periodo: linha.periodo.periodo,
        casos: linha.casos,
      },
    ]
  })
}

function numerosDeLinha(
  problemas: readonly ProblemaLinha[],
  severidade: ProblemaLinha["severidade"]
): Set<number> {
  return new Set(
    problemas
      .filter((problema) => problema.severidade === severidade)
      .flatMap((problema) => problema.linhas)
  )
}

function resumir(
  total: number,
  problemas: readonly ProblemaLinha[],
  normalizadas: readonly LinhaNormalizada[]
): ResumoAnalise {
  const comErro = numerosDeLinha(problemas, "erro")
  const comAviso = numerosDeLinha(problemas, "aviso")
  const porMotivo = { ...SEM_PROBLEMAS }
  for (const { codigo, linhas } of problemas) porMotivo[codigo] += linhas.length
  return {
    lidas: total,
    validas: total - comErro.size,
    comAviso: [...comAviso].filter((numero) => !comErro.has(numero)).length,
    comErro: comErro.size,
    semDado: normalizadas.filter(({ casos }) => casos === null).length,
    foraDaCobertura: normalizadas.filter(({ bairroId }) => bairroId === null)
      .length,
    porMotivo,
  }
}

function analiseSemMapeamento(
  arquivo: ArquivoLido,
  mapeamento: MapeamentoParcial
): AnaliseImportacao {
  return {
    mapeamento,
    colunasIgnoradas: listarColunasIgnoradas(arquivo.cabecalho, mapeamento),
    nomes: [],
    problemas: [],
    resumo: resumir(arquivo.linhas.length, [], []),
    granularidade: null,
    periodos: [],
    pendencias: 0,
    podeConfirmar: false,
    linhasNormalizadas: [],
  }
}

function listarPeriodos(linhas: readonly LinhaAnalisada[]): string[] {
  const periodos = linhas.flatMap(({ periodo }) =>
    periodo ? [periodo.periodo] : []
  )
  return [...new Set(periodos)].toSorted()
}

/**
 * Estágio 2 do motor (TechSpec EP-02 §3.1): sem I/O. Roda no navegador a cada troca de separador, coluna ou
 * decisão (DEC-T-01) e de novo no servidor, com os mesmos bairros, ao confirmar.
 */
export function analisarImportacao({
  arquivo,
  mapeamento,
  decisoes,
  bairros,
}: EntradaAnalise): AnaliseImportacao {
  const efetivo = escolherMapeamento(arquivo.cabecalho, mapeamento)
  if (!mapeamentoCompleto(efetivo)) {
    marcarAnalise()
    return analiseSemMapeamento(arquivo, efetivo)
  }

  const { linhas, granularidade } = aplicarGranularidade(
    arquivo.linhas.map((linha) => analisarLinha(linha, efetivo))
  )
  const nomes = montarNomes(linhas, decisoes, bairros)
  const destinoPorNome = new Map(
    nomes.map(({ nomeNormalizado, destino }) => [nomeNormalizado, destino])
  )
  const problemas = ordenarProblemas([
    ...problemasDasLinhas(linhas),
    ...detectarDuplicatas(linhas, destinoPorNome),
  ])
  const linhasNormalizadas = normalizarLinhas(
    linhas,
    destinoPorNome,
    numerosDeLinha(problemas, "erro")
  )
  const resumo = resumir(linhas.length, problemas, linhasNormalizadas)
  const pendencias = nomes.filter(({ destino }) => destino === null).length

  marcarAnalise()
  return {
    mapeamento: efetivo,
    colunasIgnoradas: listarColunasIgnoradas(arquivo.cabecalho, efetivo),
    nomes,
    problemas,
    resumo,
    granularidade,
    periodos: listarPeriodos(linhas),
    pendencias,
    podeConfirmar: pendencias === 0 && resumo.comErro === 0,
    linhasNormalizadas,
  }
}

/** A análise que pode virar importação: confirmável, com as três colunas e uma granularidade (RF-02.13, RF-02.19). */
export function ehConfirmavel(
  analise: AnaliseImportacao
): analise is AnaliseConfirmavel {
  return (
    analise.podeConfirmar &&
    analise.granularidade !== null &&
    mapeamentoCompleto(analise.mapeamento)
  )
}
