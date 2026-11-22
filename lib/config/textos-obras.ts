import {
  ROTULO_SITUACAO_OBRA,
  type SituacaoObra,
} from "@/lib/obras/situacao-obra"
import { flexionar } from "@/lib/territorio/formato"

// Textos de Obras (PRD EP-04 §7, TechSpec §2). Sem travessão (react-next.md §13): o separador é o hífen.
export const TEXTOS_OBRAS = {
  faixaSintetico:
    "Dados sintéticos: obras fictícias criadas para a demonstração. Não são obras municipais.",
  etiquetaSintetico: "SINTETICO",
  secoes: {
    resumo: "Resumo das obras",
    filtros: "Filtros",
    mapa: "Obras no mapa",
    lista: "Lista de obras",
  },
  filtros: { situacao: "Situação" },
  resumo: {
    total: "Total de obras",
    semLocalizacao: "Sem localização",
  },
  legenda: {
    titulo: "Legenda",
    marcadores: (total: number) => flexionar(total, "marcador", "marcadores"),
    semMarcador: "Obra sem localização não tem marcador: ela fica só na lista.",
  },
  lista: {
    legenda:
      "Obras do filtro atual, com situação, categoria, bairro, data prevista e última atualização",
    colunas: {
      obra: "Obra",
      situacao: "Situação",
      categoria: "Categoria",
      bairro: "Bairro",
      dataPrevista: "Data prevista",
      atualizadoEm: "Última atualização",
      origem: "Origem",
    },
    mostrando: (total: number) =>
      `Mostrando ${flexionar(total, "obra", "obras")}.`,
  },
  vazio: {
    comFiltros: "Nenhuma obra com estes filtros",
    limparFiltros: "Limpar filtros",
    semObras: "Nenhuma obra cadastrada",
  },
  localizacao: {
    foraDaCobertura: "Fora da cobertura dos bairros",
    semLocalizacao: "Sem localização",
    foraDoMunicipio: "O ponto está fora do município de Acaraú",
  },
  valorPrevisto: {
    rotulo: "Valor previsto",
    aviso: "Valor previsto - não é valor pago",
  },
  naoInformado: "Não informado",
  ficha: {
    titulo: "Ficha da obra",
    descricao: "Dados cadastrais e histórico de situação desta obra sintética.",
    campos: {
      situacao: "Situação",
      categoria: "Categoria",
      secretaria: "Secretaria",
      bairro: "Bairro",
      coordenadas: "Coordenadas",
      dataInicio: "Data de início",
      dataPrevista: "Data prevista",
      descricao: "Descrição",
      atualizadoEm: "Última atualização",
      origem: "Origem",
    },
    coordenadas: (latitude: string, longitude: string) =>
      `Latitude ${latitude}, longitude ${longitude}`,
  },
  metodologia: {
    titulo: "Como os números são calculados",
    contagem:
      "O resumo conta as obras do filtro atual: o total, cada uma das quatro situações e as obras sem localização. Situação sem obra mostra 0, porque é contagem de cadastro.",
    bairro:
      "O bairro da obra é calculado a partir do ponto, nunca digitado. Dentro de um bairro da sede vale o bairro; dentro do município e fora dos bairros, a obra fica como fora da cobertura dos bairros.",
    semLocalizacao:
      "Obra sem localização não aparece no mapa, mas continua na lista e no resumo.",
    valor:
      "O valor previsto não é execução financeira: nenhum valor é somado nem tratado como pago.",
    sintetico:
      "Todas as obras são sintéticas, criadas para a demonstração. Não são obras municipais.",
  },
  fontes: {
    titulo: "Obras cadastradas",
    origem: "Origem",
    origemTexto: "Sintética: criadas na demonstração",
    quantidade: "Quantidade",
    ultimaAtualizacao: "Última atualização",
    semObras: "Nenhuma obra cadastrada",
    aviso:
      "Não são obras municipais: os títulos e os dados são fictícios e servem só para a demonstração.",
  },
  acoes: {
    novaObra: "Nova obra",
    editar: "Editar obra",
    cadastrarObra: "Cadastrar obra",
  },
  form: {
    tituloNova: "Nova obra",
    tituloEditar: "Editar obra",
    campos: {
      titulo: "Título",
      situacao: "Situação",
      categoria: "Categoria",
      secretaria: "Secretaria",
      descricao: "Descrição",
      dataInicio: "Data de início",
      dataPrevista: "Data prevista",
      valorPrevisto: "Valor previsto (R$)",
      latitude: "Latitude",
      longitude: "Longitude",
    },
    semCategoria: "Sem categoria",
    valorDica: "Em reais, como 250.000,00. Não é valor pago.",
    localizacao: {
      titulo: "Localização",
      instrucao:
        "Clique no mapa para marcar o local ou informe as coordenadas em graus decimais.",
      bairroCalculado: (nomeDoBairro: string) =>
        `Bairro calculado: ${nomeDoBairro}`,
      remover: "Remover localização",
    },
    salvar: "Salvar",
    salvando: "Salvando...",
    cancelar: "Cancelar",
    sessaoExpirada: "Sua sessão expirou. Entre novamente para salvar.",
    entrarDeNovo: "Entrar novamente",
  },
  obraSalva: "Obra salva",
  situacaoAlterada: (anterior: SituacaoObra, nova: SituacaoObra) =>
    `Situação alterada de ${ROTULO_SITUACAO_OBRA[anterior]} para ${ROTULO_SITUACAO_OBRA[nova]}`,
  historico: {
    titulo: "Histórico de situação",
    autorEData: (autor: string, quando: string) => `${autor}, em ${quando}`,
    inicial: (situacao: SituacaoObra) =>
      `Obra criada como ${ROTULO_SITUACAO_OBRA[situacao]}`,
  },
  quantidade: (total: number) => flexionar(total, "obra", "obras"),
} as const
