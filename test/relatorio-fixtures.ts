import { CAMADAS_CARREGADAS } from "@/lib/config/camadas-carregadas"
import { resolverPeriodo, TODOS } from "@/lib/filtros/filtros-url"
import { montarObra } from "@/lib/obras/__fixtures__/obra"
import {
  montarSecaoEducacao,
  montarSecaoFontes,
  montarSecaoObras,
  montarSecaoSaude,
  montarSecaoTerritorio,
} from "@/lib/relatorios/secoes-relatorio"
import type { RelatorioDados } from "@/lib/relatorios/tipos-relatorio"
import type { AnaliseDatasetSaude } from "@/lib/saude/analise-dataset"
import {
  listarResumoBairros,
  obterDadosMapaResumo,
  obterDadosTerritorio,
} from "@/lib/server/territorio/territorio-repositorio"
import type { Obra } from "@/lib/validations/obra-schema"
import { ANALISE_SAUDE } from "@/test/saude-fixtures"

// `RelatorioDados` montado pelas funções reais (as mesmas do servidor), com o território do artefato: os testes de
// interface do relatório partem de dado verdadeiro, não de um objeto escrito à mão que pode divergir do contrato.

type OpcoesDoRelatorio = {
  /** `null` = nenhum dataset visível. */
  analise?: AnaliseDatasetSaude | null
  /** `periodo` da URL; `TODOS` = o mais recente. */
  periodo?: string
  /** ID do bairro filtrado. */
  bairroId?: string | null
  obras?: readonly Obra[]
  /** `false` tira a camada de escolas (fonte ausente). */
  comCamadaDeEscolas?: boolean
  autor?: string
}

export const OBRAS_DO_RELATORIO: Obra[] = [
  montarObra({
    id: "obra-centro",
    titulo: "DEMO - Praça no Centro",
    situacao: "planejada",
    estadoLocalizacao: "dentro-de-bairro",
    bairroId: "uv-10",
    dataPrevista: "2027-03-15",
    valorPrevistoCentavos: 25_000_000,
    atualizadoEm: "2026-11-03T10:00:00.000Z",
  }),
  montarObra({
    id: "obra-sem-ponto",
    titulo: "DEMO - Área de lazer",
    situacao: "em_andamento",
    atualizadoEm: "2026-11-06T10:00:00.000Z",
  }),
]

export function relatorioDeTeste({
  analise = ANALISE_SAUDE,
  periodo = TODOS,
  bairroId = null,
  obras = OBRAS_DO_RELATORIO,
  comCamadaDeEscolas = true,
  autor = "Visitante",
}: OpcoesDoRelatorio = {}): RelatorioDados {
  const bairros = listarResumoBairros()
  const bairroSelecionado = bairros.find(({ id }) => id === bairroId) ?? null
  const resolucao = analise
    ? resolverPeriodo({ bairro: TODOS, periodo }, analise.periodos)
    : null
  const camadaEscolas = comCamadaDeEscolas
    ? CAMADAS_CARREGADAS.find(({ id }) => id === "escolas")
    : undefined
  return {
    filtros: {
      bairro: bairroSelecionado,
      bairroNaoReconhecido: false,
      periodo: resolucao,
    },
    autor,
    versaoApp: "0.5.0+a1b2c3d",
    universo: "24 bairros da sede; não cobre o município inteiro",
    versaoPrivada: analise?.versao.situacao === "privado",
    territorio: montarSecaoTerritorio(
      obterDadosMapaResumo(),
      CAMADAS_CARREGADAS
    ),
    saude: montarSecaoSaude({ analise, resolucao, bairros, bairroSelecionado }),
    educacao: montarSecaoEducacao({
      dados: obterDadosTerritorio(),
      camadaEscolas,
      bairroSelecionado,
    }),
    obras: montarSecaoObras({ obras, bairros, bairroId }),
    fontes: montarSecaoFontes({
      camadas: CAMADAS_CARREGADAS,
      datasets:
        analise?.versao.situacao === "publicado"
          ? [
              {
                dataset: { nome: analise.dataset.nome },
                versao: {
                  numero: analise.versao.numero,
                  publicadoEm: analise.versao.publicadoEm,
                },
              },
            ]
          : [],
      obras,
    }),
  }
}
