// Mensagens-chave da Saúde e da importação (PRD EP-02 §7, TechSpec §3.4). Sem travessão (react-next.md §13): o
// separador é o hífen. As tarefas seguintes acrescentam aqui o texto de cada mensagem na hora em que a usam.
export const TEXTOS_SAUDE = {
  faixaSintetico:
    "Dados sintéticos: números fictícios criados para a demonstração.",
  taxa: "A taxa exige a população de cada bairro no período, que a demonstração não tem. Por isso mostramos contagens.",
  total: (bairrosComDados: number) =>
    bairrosComDados === 1
      ? "Soma de 1 bairro com dados no período."
      : `Soma dos ${bairrosComDados} bairros com dados no período.`,
  reset:
    "Reiniciar a demonstração apaga os datasets importados e restaura o dataset de exemplo. Bairros, escolas e camadas não mudam.",
  regraRanking:
    "Ordem: mais casos primeiro; empate em ordem alfabética do nome do bairro.",
  classeUnica:
    "Todos os bairros com dados têm o mesmo valor: uma única classe.",
  jaImportado: (nome: string, numero: number) =>
    `Este arquivo já foi importado no dataset ${nome} (versão ${numero}).`,
  privado: "Privado: não visível ao visitante.",
  sessaoExpirada:
    "Sua sessão expirou. Entre de novo e reenvie o arquivo; nada foi gravado.",
  dadoPessoal: {
    coluna: (coluna: string) =>
      `Arquivo recusado: a coluna ${coluna} parece conter dado pessoal. A demonstração aceita só contagens agregadas por bairro e período.`,
    linha: (linha: number) =>
      `Arquivo recusado: a linha ${linha} tem um valor no formato de CPF. A demonstração aceita só contagens agregadas por bairro e período.`,
  },
} as const
