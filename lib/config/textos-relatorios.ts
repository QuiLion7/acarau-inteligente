import { flexionar } from "@/lib/territorio/formato"

// Catálogo de textos do relatório (TechSpec EP-05 §2, PRD EP-05 §7). Sem travessão (react-next.md §13, DEC-T-14): o
// separador é o hífen. A prévia e o PDF leem daqui, então os dois dizem exatamente a mesma coisa.
export const TEXTOS_RELATORIOS = {
  titulo:
    "Relatório territorial - Acaraú Inteligente (Demonstração Independente)",
  tituloDaPagina: "Relatórios",
  descricaoDaPagina:
    "Monte o relatório com os mesmos filtros da tela, confira a prévia e gere o PDF.",
  avisoDemonstracao:
    "Demonstração Independente: não constitui sistema oficial da Prefeitura de Acaraú. Os dados são agregados e sintéticos, sempre com a procedência indicada.",
  avisoRodape:
    "Demonstração Independente - dados agregados e sintéticos - não constitui sistema oficial",
  marcaDagua: "DEMONSTRAÇÃO",
  universo: "24 bairros da sede; não cobre o município inteiro",
  versaoNaoPublicada: "Versão não publicada - uso interno",
  dadosSinteticos: "DADOS SINTÉTICOS",
  fonteAusente: "Fonte ausente",
  naoInformada: "Não informada",
  visitante: "Visitante",
  geradoAoClicar: "gerado ao clicar em Gerar PDF",
  todosOsBairros: "Todos os bairros",
  periodoMaisRecente: (periodo: string) => `${periodo} (mais recente)`,
  semPeriodo: "Sem período (nenhum dataset disponível)",
  cabecalho: {
    geradoEm: "Gerado em",
    bairro: "Bairro",
    periodo: "Período",
    universo: "Universo",
    geradoPor: "Gerado por",
    versaoApp: "Versão da aplicação",
  },
  bairroNaoReconhecido:
    "O bairro pedido não foi reconhecido: o relatório mostra todos os bairros.",
  secoes: {
    territorio: "Território",
    saude: "Saúde",
    educacao: "Educação",
    obras: "Obras",
    fontes: "Fontes e limitações",
  },
  territorio: {
    mapa: "Mapa dos 24 bairros da sede",
    bairroDestacado: (nome: string) =>
      `Bairro em destaque (contorno grosso): ${nome}`,
    geometria: "Fonte da geometria",
    legenda: "Legenda",
    bairro: "Bairro da sede",
  },
  saude: {
    nenhumDataset: "Sem dados: nenhum dataset de saúde disponível.",
    nenhumDatasetDetalhe:
      "Não há dataset publicado para o seu perfil. A Saúde não mostra números enquanto não houver um.",
    periodoSemDados: (valor: string) =>
      `Período sem dados: o dataset não tem o período ${valor}.`,
    bairroSemDado: "Bairro sem dado no período.",
    dataset: "Dataset",
    indicador: "Indicador",
    fonte: "Fonte",
    versao: "Versão",
    importadoEm: "Importado em",
    situacao: "Situação",
    publicada: "Publicada",
    naoPublicada: "Não publicada",
    mapa: "Mapa por bairro",
    ranking: "Ranking dos bairros",
    rankingPosicao: "Posição",
    tabela: "Casos por bairro",
    tabelaBairro: "Bairro",
    tabelaCasos: "Casos",
    tabelaSituacao: "Situação",
    situacoes: {
      valor: "Com casos",
      zero: "Zero informado",
      semDados: "Sem dados",
    },
    semDadosNoPeriodo: "Bairros sem dados no período",
    grafico: "Casos por período",
    graficoLacunas: (periodos: readonly string[]) =>
      `Sem valor em ${periodos.join(", ")} (lacuna, não é zero).`,
    graficoDoBairro: (nome: string) => `Bairro: ${nome}`,
    graficoTodos: "Soma dos bairros com dados",
    legenda: {
      titulo: "Legenda do mapa",
      zero: "Zero informado (0 casos)",
      semDados: "Sem dados",
      destaque: "Bairro do filtro (contorno grosso)",
      metodo: "Método: quantis (até 5 classes).",
    },
  },
  educacao: {
    fonteAusente:
      "Fonte da camada de escolas ausente: os números não são exibidos sem fonte.",
    cards: "Resumo das escolas da base",
    porBairro: "Escolas por bairro",
    porBairroBairro: "Bairro",
    porBairroTotal: "Escolas",
    escolasDoBairro: (nome: string) => `Escolas em ${nome}`,
    escolasColunas: {
      codigo: "Código INEP",
      nome: "Escola",
      dependencia: "Dependência",
      localizacao: "Localização",
    },
    nenhumaEscolaNoBairro:
      "Nenhuma escola da base disponível dentro deste bairro. A base não é um censo completo.",
    pendencias: "Pendências de qualidade da base",
    pendenciasSemLocalizacao: "Sem localização (não aparecem no mapa)",
    pendenciasForaDoLimite: "Fora do limite municipal",
    pendenciasForaDaCobertura: (total: number) =>
      `Fora da cobertura dos bairros: ${flexionar(total, "escola", "escolas")}.`,
    nenhuma: "Nenhuma.",
  },
  obras: {
    resumo: "Resumo das obras",
    total: "Total de obras",
    semLocalizacao: "Sem localização",
    lista: "Obras do filtro",
    colunas: {
      obra: "Obra",
      situacao: "Situação",
      bairro: "Bairro",
      dataPrevista: "Data prevista",
      origem: "Origem",
    },
    nenhuma: "Nenhuma obra com este filtro.",
    valorPrevisto: "Valor previsto - não é valor pago",
    semDataPrevista: "Não informada",
  },
  fontes: {
    camadas: "Camadas carregadas",
    camadaColunas: {
      nome: "Camada",
      fonte: "Fonte",
      etiqueta: "Proveniência",
      versao: "Versão",
      dataReferencia: "Data de referência",
    },
    datasets: "Datasets publicados",
    datasetsNenhum: "Nenhum dataset publicado.",
    datasetVersao: (nome: string, versao: number) =>
      `${nome} (versão ${versao})`,
    publicadoEm: (instante: string) => `publicado em ${instante}`,
    obras: "Obras cadastradas",
    obrasResumo: (quantidade: number, ultima: string | null) =>
      ultima === null
        ? "Nenhuma obra cadastrada."
        : `${flexionar(quantidade, "obra sintética", "obras sintéticas")}; última atualização em ${ultima}.`,
    atribuicao: "Mapa base: © OpenStreetMap contributors (licença ODbL).",
    limitacoes: "Limitações",
  },
  pdf: {
    gerar: "Gerar PDF",
    gerando: "Gerando o PDF...",
    erro: "Não foi possível gerar o PDF. Tente de novo.",
    tentarDeNovo: "Tentar de novo",
    baixado: "PDF gerado.",
  },
  erro: {
    versaoNaoEncontrada: "Versão não encontrada",
    versaoNaoEncontradaDescricao:
      "Esta versão do dataset não existe ou não está disponível para você.",
  },
} as const
