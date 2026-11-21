import type { RelatorioImportacao } from "@/lib/importacao/relatorio-schema"
import type {
  AnaliseConfirmavel,
  ArquivoLido,
  NomeDistinto,
} from "@/lib/importacao/tipos-importacao"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"

// Relatório de processamento (RF-02.23, RF-02.11): o que foi lido, como as colunas e os bairros foram resolvidos e
// quanto foi gravado. Puro: serve à confirmação do analista e à carga do dataset pré-carregado.

type EntradaRelatorio = {
  arquivo: ArquivoLido
  analise: AnaliseConfirmavel
  hashConteudo: string
  bairros: readonly BairroResumo[]
}

type DecisaoDoRelatorio = RelatorioImportacao["decisoesBairro"][number]

function decisaoDoNome(
  nome: NomeDistinto,
  bairros: readonly BairroResumo[]
): DecisaoDoRelatorio[] {
  const { destino } = nome
  // Nome sem destino (pendente) não é decisão: numa análise confirmável não há nenhum.
  if (destino === null) return []
  const comum = { nomeOriginal: nome.nomeOriginal, linhas: nome.linhas }
  if (destino.tipo === "fora-da-cobertura") {
    return [
      { ...comum, destino: { tipo: "fora-da-cobertura" }, origem: "manual" },
    ]
  }
  const bairro = bairros.find(({ id }) => id === destino.bairroId)
  const nomeDoBairro = bairro?.nome ?? destino.bairroId
  return [
    {
      ...comum,
      destino: {
        tipo: "bairro",
        bairroId: destino.bairroId,
        nome: nomeDoBairro,
      },
      origem: destino.origem,
    },
  ]
}

export function montarRelatorio({
  arquivo,
  analise,
  hashConteudo,
  bairros,
}: EntradaRelatorio): RelatorioImportacao {
  const { mapeamento, resumo } = analise
  return {
    nomeArquivo: arquivo.nome,
    hashConteudo,
    separador: arquivo.separador,
    encoding: arquivo.encoding,
    mapeamento: {
      bairro: arquivo.cabecalho[mapeamento.bairro] ?? "",
      periodo: arquivo.cabecalho[mapeamento.periodo] ?? "",
      casos: arquivo.cabecalho[mapeamento.casos] ?? "",
    },
    colunasIgnoradas: analise.colunasIgnoradas,
    decisoesBairro: analise.nomes.flatMap((nome) =>
      decisaoDoNome(nome, bairros)
    ),
    contagens: {
      lidas: resumo.lidas,
      gravadas: analise.linhasNormalizadas.length,
      semDado: resumo.semDado,
      foraDaCobertura: resumo.foraDaCobertura,
      avisos: resumo.comAviso,
    },
    granularidade: analise.granularidade,
    periodos: analise.periodos,
  }
}
