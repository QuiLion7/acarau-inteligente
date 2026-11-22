import type { ResolucaoPeriodo } from "@/lib/filtros/filtros-url"
import type { SituacaoObra } from "@/lib/obras/situacao-obra"
import type { ResumoObras } from "@/lib/obras/filtro-obras"
import type { MapaProjetado } from "@/lib/relatorios/mapa-svg"
import type {
  AnalisePeriodo,
  ItemBairroPeriodo,
} from "@/lib/saude/analise-periodo"
import type { ItemDoRanking } from "@/lib/saude/ranking"
import type { PontoSerie } from "@/lib/saude/serie-temporal"
import type { VariacaoPeriodo } from "@/lib/saude/variacao-periodo"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"
import type { CamadaCarregada } from "@/lib/config/camadas-carregadas"
import type {
  DatasetResumo,
  VersaoResumo,
} from "@/lib/validations/datasets-schema"

// Modelo único da prévia e do PDF (TechSpec EP-05 §4.1, DEC-T-03, DV-49): montado no servidor com as funções puras das
// telas e só serializável (nada de Date, Map ou função), porque cruza a fronteira Server → Client. A data de geração
// não faz parte dele: é o instante do clique.

export type FiltrosDoRelatorio = {
  /** `null` = todos os bairros. */
  bairro: BairroResumo | null
  /** O `bairro` da URL não é um ID de bairro carregado: o relatório segue como "todos" e avisa (DV-35). */
  bairroNaoReconhecido: boolean
  /** `null` = a Saúde não tem dataset visível, então não há período a resolver. */
  periodo: ResolucaoPeriodo | null
}

export type DatasetDoRelatorio = Pick<
  DatasetResumo,
  "nome" | "indicador" | "fonte" | "unidade" | "proveniencia"
> & {
  versaoNumero: number
  granularidade: VersaoResumo["granularidade"]
  importadoEm: string
  /** `false` = versão privada (uso interno do analista). */
  publicada: boolean
}

/** Cartão do bairro filtrado (o mesmo da tela): posição no ranking e variação do próprio bairro. */
export type DestaqueDoBairro = {
  item: ItemBairroPeriodo
  /** `null` quando o bairro não tem dado no período (fora do ranking). */
  posicao: number | null
  totalNoRanking: number
  variacao: VariacaoPeriodo
}

/** União discriminada: a ausência nunca vira `0` (RN-05.03). */
export type SecaoSaude =
  | { estado: "nenhum-dataset" }
  | {
      estado: "periodo-sem-dados"
      dataset: DatasetDoRelatorio
      /** O texto pedido na URL, que o dataset não tem; nunca é usado para escolher dado de outro período. */
      valor: string
      /** Os períodos que existem, para o seletor oferecer a saída (como "Limpar período" na tela). */
      periodos: string[]
    }
  | {
      estado: "ok"
      dataset: DatasetDoRelatorio
      periodo: string
      /** Os períodos do dataset, em ordem crescente: o gráfico só aparece com mais de um (RF-011). */
      periodos: string[]
      analise: AnalisePeriodo
      ranking: ItemDoRanking[]
      semDados: BairroResumo[]
      serie: PontoSerie[]
      variacao: VariacaoPeriodo
      destaqueDoBairro: DestaqueDoBairro | null
      /** Liga o texto "bairro sem dado no período" (RF-05.11). */
      bairroSemDado: boolean
    }

export type EscolaDoRelatorio = {
  codigoInep: string
  nome: string
  dependencia: string
  localizacao: string
}

export type EscolaPendente = { codigoInep: string; nome: string }

export type SecaoEducacao = {
  cards: {
    totalCatalogo: number
    comLocalizacao: number
    semLocalizacao: number
    dentroDeBairros: number
    /** Fora da cobertura dos bairros, sem a escola fora do limite (DV-39): 24 + 33 + 1 + 4 = 62. */
    foraDaCobertura: number
    foraDoLimite: number
  }
  porBairro: { bairro: BairroResumo; total: number }[]
  /** `null` = todos os bairros (a tabela por bairro cobre o resumo). */
  escolasDoBairro: EscolaDoRelatorio[] | null
  pendencias: {
    semLocalizacao: EscolaPendente[]
    foraDaCobertura: number
    foraDoLimite: EscolaPendente[]
  }
  /** `null` = a camada de escolas não está carregada: a seção diz "fonte ausente" em vez dos números (RN-03.12). */
  fonte: string | null
  /** `null` vira "Não informada". */
  dataReferencia: string | null
}

export type ObraDoRelatorio = {
  id: string
  titulo: string
  situacao: SituacaoObra
  /** Nome do bairro, "Fora da cobertura dos bairros" ou "Sem localização": nunca o id técnico. */
  bairro: string
  dataPrevista: string | null
  /** Sempre `SINTETICO` (DV-43). */
  proveniencia: string
  valorPrevistoCentavos: number | null
}

export type SecaoObras = {
  resumo: ResumoObras
  lista: ObraDoRelatorio[]
  /** Liga o aviso "valor previsto não é valor pago" (RN-021). */
  temValor: boolean
}

export type SecaoFontes = {
  camadas: CamadaCarregada[]
  datasets: { nome: string; versao: number; publicadoEm: string | null }[]
  obras: { quantidade: number; ultimaAtualizacao: string | null }
}

export type SecaoTerritorio = {
  /** Os 24 bairros já projetados em SVG: o mesmo desenho na prévia e no PDF, sem geometria bruta no cliente. */
  mapa: MapaProjetado
  fonteGeometria: string
  avisoReconstrucao: string
}

export type RelatorioDados = {
  filtros: FiltrosDoRelatorio
  /** Nome da conta demo ou "Visitante". */
  autor: string
  versaoApp: string
  universo: string
  /** Liga o aviso "Versão não publicada - uso interno" no cabeçalho e na Saúde (RF-05.15). */
  versaoPrivada: boolean
  territorio: SecaoTerritorio
  saude: SecaoSaude
  educacao: SecaoEducacao
  obras: SecaoObras
  fontes: SecaoFontes
}
