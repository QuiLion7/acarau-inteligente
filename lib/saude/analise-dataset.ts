import type {
  DatasetResumo,
  SerieSaude,
  VersaoResumo,
} from "@/lib/validations/datasets-schema"

/** Uma versão que o papel pode escolher no seletor da Saúde (RF-02.28). */
export type OpcaoDeVersao = {
  id: string
  rotulo: string
  situacao: VersaoResumo["situacao"]
}

/**
 * O que a Saúde recebe do servidor (TechSpec EP-02 §4.4): a série agregada da versão em exibição, quem ela é e o que
 * o papel pode fazer. Só campos serializáveis e usados na tela; as contas e os totais saem de `lib/saude/*`.
 */
export type AnaliseDatasetSaude = SerieSaude & {
  versao: Pick<
    VersaoResumo,
    | "id"
    | "numero"
    | "situacao"
    | "importadoEm"
    | "publicadoEm"
    | "granularidade"
  >
  dataset: Pick<
    DatasetResumo,
    "nome" | "indicador" | "fonte" | "unidade" | "proveniencia"
  >
  opcoes: OpcaoDeVersao[]
  /** Analista ou administrador: vê Publicar, Importar CSV e Datasets. */
  podeGerenciar: boolean
}
