import { flexionar } from "@/lib/territorio/formato"

// Textos da Auditoria (PRD EP-05 §7). Sem travessão (react-next.md §13): o separador é o hífen.
export const TEXTOS_AUDITORIA = {
  titulo: "Auditoria",
  descricao:
    "Quem fez o quê e quando: entradas, importações, publicações, obras e reinícios da demonstração. A auditoria só cresce: nem o reinício a apaga.",
  linkDaAdministracao: "Auditoria",
  filtros: {
    titulo: "Filtros da auditoria",
    tipo: "Tipo de evento",
    conta: "Conta",
    de: "De",
    ate: "Até",
    todosTipos: "Todos os tipos",
    todasContas: "Todas as contas",
    contaDesconhecida: "Conta desconhecida",
    limpar: "Limpar filtros",
  },
  tabela: {
    legenda:
      "Eventos de auditoria, do mais recente ao mais antigo, com data e hora, conta, evento, alvo e resultado",
    colunas: {
      quando: "Data e hora",
      conta: "Conta",
      evento: "Evento",
      alvo: "Alvo",
      resultado: "Resultado",
      detalhes: "Detalhes",
    },
    mostrarDetalhes: "Mostrar detalhes",
    ocultarDetalhes: "Ocultar detalhes",
    semDetalhes: "Sem detalhes adicionais.",
    semAlvo: "-",
    removidoPeloReset: "removido pelo reset",
    alvos: { obra: "Obra", dataset_versao: "Versão de dataset" },
    resultados: { sucesso: "Sucesso", recusado: "Recusado" },
    total: (total: number) => flexionar(total, "evento", "eventos"),
    pagina: (pagina: number, paginas: number) =>
      `Página ${pagina} de ${paginas}`,
    anterior: "Página anterior",
    proxima: "Próxima página",
  },
  vazio: {
    comFiltros: "Nenhum evento com estes filtros",
    semEventos: "Nenhum evento registrado ainda",
  },
  /** Rótulo em português de cada campo de `detalhes` (catálogo de eventos). */
  detalhes: {
    rota: "Rota",
    motivo: "Motivo",
    numero: "Número da versão",
    linhas: "Linhas gravadas",
    codigo: "Código da recusa",
    situacaoAlterada: "Situação alterada",
    datasetsRemovidos: "Datasets removidos",
    obrasRemovidas: "Obras removidas",
  } as Record<string, string>,
  simNao: { verdadeiro: "Sim", falso: "Não" },
} as const
