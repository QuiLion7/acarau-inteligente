import type { CamadaCarregada } from "@/lib/config/camadas-carregadas"
import { TEXTOS_RELATORIOS } from "@/lib/config/textos-relatorios"
import { TEXTOS_TERRITORIO } from "@/lib/config/textos-territorio"
import type { ResolucaoPeriodo } from "@/lib/filtros/filtros-url"
import { filtrarObras, resumirObras } from "@/lib/obras/filtro-obras"
import { rotuloDoBairroDaObra } from "@/lib/obras/apresentacao-obra"
import { projetarMapa } from "@/lib/relatorios/mapa-svg"
import type {
  DatasetDoRelatorio,
  SecaoEducacao,
  SecaoFontes,
  SecaoObras,
  SecaoSaude,
  SecaoTerritorio,
} from "@/lib/relatorios/tipos-relatorio"
import type { AnaliseDatasetSaude } from "@/lib/saude/analise-dataset"
import { montarAnalisePeriodo } from "@/lib/saude/analise-periodo"
import { ordenarRanking, posicaoNoRanking } from "@/lib/saude/ranking"
import { montarSerieTemporal } from "@/lib/saude/serie-temporal"
import { calcularVariacao } from "@/lib/saude/variacao-periodo"
import type {
  BairroResumo,
  DadosMapaResumo,
  DadosTerritorio,
} from "@/lib/territorio/artefato-schema"
import { foraDaCoberturaDosBairros } from "@/lib/territorio/contagem-cobertura"
import type { Obra } from "@/lib/validations/obra-schema"

// Seções do relatório (TechSpec EP-05 §2, DV-49): funções puras sobre as peças que as telas já usam (DV-26, DV-36,
// DV-37, DV-39, DV-42). Nenhuma conta nova: o que a prévia e o PDF mostram é o que a tela mostra para o mesmo filtro
// (RN-05.01). Sem dado, o estado diz "sem dados"; a ausência nunca vira `0` (RN-05.03).

// Moldura fixa do mapa do relatório (A4 em retrato, com margem para o contorno grosso do destaque).
const MOLDURA_DO_MAPA = { largura: 600, altura: 520, margem: 8 } as const

export function descreverDataset(
  analise: Pick<AnaliseDatasetSaude, "dataset" | "versao">
): DatasetDoRelatorio {
  const { dataset, versao } = analise
  return {
    nome: dataset.nome,
    indicador: dataset.indicador,
    fonte: dataset.fonte,
    unidade: dataset.unidade,
    proveniencia: dataset.proveniencia,
    versaoNumero: versao.numero,
    granularidade: versao.granularidade,
    importadoEm: versao.importadoEm,
    publicada: versao.situacao === "publicado",
  }
}

type EntradaSaude = {
  /** `null` = nenhuma versão visível ao papel. */
  analise: AnaliseDatasetSaude | null
  /** Resolução do período da URL contra os períodos do dataset (`resolverPeriodo`); `null` sem dataset. */
  resolucao: ResolucaoPeriodo | null
  bairros: readonly BairroResumo[]
  bairroSelecionado: BairroResumo | null
}

/** Reproduz no servidor o que o `useMemo` de `components/saude/analise-saude.tsx` calcula no cliente. */
export function montarSecaoSaude({
  analise,
  resolucao,
  bairros,
  bairroSelecionado,
}: EntradaSaude): SecaoSaude {
  if (analise === null || resolucao === null)
    return { estado: "nenhum-dataset" }
  const dataset = descreverDataset(analise)
  if (resolucao.tipo === "sem-dados") {
    return {
      estado: "periodo-sem-dados",
      dataset,
      valor: resolucao.valor,
      periodos: [...analise.periodos],
    }
  }

  const { periodo } = resolucao
  const analisePeriodo = montarAnalisePeriodo(analise, periodo, bairros)
  const { ranking, semDados } = ordenarRanking(analisePeriodo.bairros)
  const itemDoBairro =
    analisePeriodo.bairros.find(
      ({ bairro }) => bairro.id === bairroSelecionado?.id
    ) ?? null
  return {
    estado: "ok",
    dataset,
    periodo,
    periodos: [...analise.periodos],
    analise: analisePeriodo,
    ranking,
    semDados,
    serie: montarSerieTemporal(analise, bairroSelecionado?.id ?? null),
    variacao: calcularVariacao(analise, periodo, bairros),
    destaqueDoBairro:
      itemDoBairro && bairroSelecionado
        ? {
            item: itemDoBairro,
            posicao: posicaoNoRanking(ranking, itemDoBairro.bairro.id),
            totalNoRanking: ranking.length,
            variacao: calcularVariacao(analise, periodo, [bairroSelecionado]),
          }
        : null,
    bairroSemDado: itemDoBairro?.situacao === "sem-dados",
  }
}

type EntradaEducacao = {
  dados: Pick<DadosTerritorio, "bairros" | "escolas" | "qualidade">
  /** A camada de escolas de `CAMADAS_CARREGADAS`; ausente = "fonte ausente" no lugar dos números (RN-03.12). */
  camadaEscolas: Pick<CamadaCarregada, "fonte" | "dataReferencia"> | undefined
  bairroSelecionado: BairroResumo | null
}

/** Os números vêm de `qualidade` e de `totalEscolas`, sem recontar (DV-37); a escola fora do limite sai da conta da cobertura (DV-39). */
export function montarSecaoEducacao({
  dados,
  camadaEscolas,
  bairroSelecionado,
}: EntradaEducacao): SecaoEducacao {
  const { bairros, escolas, qualidade } = dados
  return {
    cards: {
      totalCatalogo: qualidade.totalCatalogo,
      comLocalizacao: qualidade.comLocalizacao,
      semLocalizacao: qualidade.semLocalizacao,
      dentroDeBairros: qualidade.dentroDeBairros,
      foraDaCobertura: foraDaCoberturaDosBairros(qualidade),
      foraDoLimite: qualidade.foraDoLimite,
    },
    porBairro: bairros.map(({ id, uv, nome, nomeLei, totalEscolas }) => ({
      bairro: { id, uv, nome, nomeLei },
      total: totalEscolas,
    })),
    escolasDoBairro: bairroSelecionado
      ? escolas
          .filter(
            ({ estado, bairroId }) =>
              estado === "dentro-de-bairro" && bairroId === bairroSelecionado.id
          )
          .map(({ codigoInep, nome, dependencia, localizacao }) => ({
            codigoInep,
            nome,
            dependencia,
            localizacao,
          }))
      : null,
    pendencias: {
      semLocalizacao: qualidade.semLocalizacaoLista.map(
        ({ codigoInep, nome }) => ({ codigoInep, nome })
      ),
      foraDaCobertura: foraDaCoberturaDosBairros(qualidade),
      foraDoLimite: qualidade.foraDoLimiteLista.map(({ codigoInep, nome }) => ({
        codigoInep,
        nome,
      })),
    },
    fonte: camadaEscolas?.fonte ?? null,
    dataReferencia: camadaEscolas?.dataReferencia ?? null,
  }
}

type EntradaObras = {
  obras: readonly Obra[]
  bairros: readonly { id: string; nome: string }[]
  /** Só o bairro filtra Obras no relatório (DV-42); `null` = todos. */
  bairroId: string | null
}

export function montarSecaoObras({
  obras,
  bairros,
  bairroId,
}: EntradaObras): SecaoObras {
  const filtradas = filtrarObras(obras, { situacoes: [], bairroId })
  return {
    resumo: resumirObras(filtradas),
    lista: filtradas.map((obra) => ({
      id: obra.id,
      titulo: obra.titulo,
      situacao: obra.situacao,
      bairro: rotuloDoBairroDaObra(obra, bairros),
      dataPrevista: obra.dataPrevista,
      proveniencia: obra.proveniencia,
      valorPrevistoCentavos: obra.valorPrevistoCentavos,
    })),
    temValor: filtradas.some(
      ({ valorPrevistoCentavos }) => valorPrevistoCentavos !== null
    ),
  }
}

type EntradaFontes = {
  camadas: readonly CamadaCarregada[]
  datasets: readonly {
    dataset: { nome: string }
    versao: { numero: number; publicadoEm: string | null }
  }[]
  /** Todas as obras cadastradas, não as do filtro: "Fontes" descreve a base (como a página Fontes). */
  obras: readonly Pick<Obra, "atualizadoEm">[]
}

export function montarSecaoFontes({
  camadas,
  datasets,
  obras,
}: EntradaFontes): SecaoFontes {
  const ultima = obras.reduce<string | null>(
    (maior, { atualizadoEm }) =>
      maior === null || atualizadoEm > maior ? atualizadoEm : maior,
    null
  )
  return {
    camadas: [...camadas],
    datasets: datasets.map(({ dataset, versao }) => ({
      nome: dataset.nome,
      versao: versao.numero,
      publicadoEm: versao.publicadoEm,
    })),
    obras: { quantidade: obras.length, ultimaAtualizacao: ultima },
  }
}

export function montarSecaoTerritorio(
  mapa: Pick<DadosMapaResumo, "bairros" | "limite">,
  camadas: readonly Pick<CamadaCarregada, "id" | "fonte">[]
): SecaoTerritorio {
  return {
    mapa: projetarMapa(mapa, MOLDURA_DO_MAPA),
    fonteGeometria:
      camadas.find(({ id }) => id === "bairros")?.fonte ??
      TEXTOS_RELATORIOS.fonteAusente,
    avisoReconstrucao: TEXTOS_TERRITORIO.avisoReconstrucao,
  }
}
