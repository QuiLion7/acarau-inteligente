import "server-only"

import type { SessaoValida } from "@/lib/auth/papeis"
import { CAMADAS_CARREGADAS } from "@/lib/config/camadas-carregadas"
import { TEXTOS_RELATORIOS } from "@/lib/config/textos-relatorios"
import { versaoDaApp } from "@/lib/config/versao-app"
import {
  resolverBairro,
  resolverPeriodo,
  type Filtros,
} from "@/lib/filtros/filtros-url"
import {
  montarSecaoEducacao,
  montarSecaoFontes,
  montarSecaoObras,
  montarSecaoSaude,
  montarSecaoTerritorio,
} from "@/lib/relatorios/secoes-relatorio"
import type { RelatorioDados } from "@/lib/relatorios/tipos-relatorio"
import { montarAnaliseDataset } from "@/lib/server/datasets/analise-dataset-servico"
import { listarDatasetsPublicados } from "@/lib/server/datasets/dataset-repositorio"
import type { Banco } from "@/lib/server/db/cliente"
import { listarObras } from "@/lib/server/obras/obra-repositorio"
import {
  listarResumoBairros,
  obterDadosMapaResumo,
  obterDadosTerritorio,
} from "@/lib/server/territorio/territorio-repositorio"

export type EntradaRelatorio = {
  filtros: Filtros
  /** `versao` da URL, já validada como uuid (ou `null`). */
  versaoId: string | null
  sessao: SessaoValida | null
}

export type ResultadoRelatorio =
  { status: "ok"; dados: RelatorioDados } | { status: "versao-nao-encontrada" }

/**
 * Monta o `RelatorioDados` que a prévia e o PDF consomem (DEC-T-03, DV-49): lê em paralelo e compõe as seções com as
 * mesmas funções das telas. A visibilidade da versão é decidida por `montarAnaliseDataset` (DV-25): o visitante que
 * pede uma versão privada recebe `versao-nao-encontrada`, sem nenhum dado dela; o analista recebe o relatório com o
 * aviso de versão não publicada (RF-05.15).
 */
export async function montarRelatorio(
  banco: Banco,
  { filtros, versaoId, sessao }: EntradaRelatorio
): Promise<ResultadoRelatorio> {
  const papel = sessao?.papel ?? "visitante"
  const [resultadoSaude, obras, datasetsPublicados] = await Promise.all([
    montarAnaliseDataset(banco, { versaoId, papel }),
    listarObras(banco),
    listarDatasetsPublicados(banco),
  ])
  if (resultadoSaude.status === "nao-encontrada") {
    return { status: "versao-nao-encontrada" }
  }

  const analise = resultadoSaude.status === "ok" ? resultadoSaude.analise : null
  const bairros = listarResumoBairros()
  const selecao = resolverBairro(filtros, bairros)
  const bairroSelecionado = selecao.tipo === "bairro" ? selecao.bairro : null
  const resolucao = analise ? resolverPeriodo(filtros, analise.periodos) : null

  return {
    status: "ok",
    dados: {
      filtros: {
        bairro: bairroSelecionado,
        bairroNaoReconhecido: selecao.tipo === "nao-reconhecido",
        periodo: resolucao,
      },
      autor: sessao?.nome ?? TEXTOS_RELATORIOS.visitante,
      versaoApp: versaoDaApp(),
      universo: TEXTOS_RELATORIOS.universo,
      versaoPrivada: analise?.versao.situacao === "privado",
      territorio: montarSecaoTerritorio(
        obterDadosMapaResumo(),
        CAMADAS_CARREGADAS
      ),
      saude: montarSecaoSaude({
        analise,
        resolucao,
        bairros,
        bairroSelecionado,
      }),
      educacao: montarSecaoEducacao({
        dados: obterDadosTerritorio(),
        camadaEscolas: CAMADAS_CARREGADAS.find(({ id }) => id === "escolas"),
        bairroSelecionado,
      }),
      obras: montarSecaoObras({
        obras,
        bairros,
        bairroId: bairroSelecionado?.id ?? null,
      }),
      fontes: montarSecaoFontes({
        camadas: CAMADAS_CARREGADAS,
        datasets: datasetsPublicados,
        obras,
      }),
    },
  }
}
