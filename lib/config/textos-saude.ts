import type { VariacaoPeriodo } from "@/lib/saude/variacao-periodo"
import { flexionar } from "@/lib/territorio/formato"

// Mensagens-chave da Saúde e da importação (PRD EP-02 §7, TechSpec §3.4). Sem travessão (react-next.md §13): o
// separador é o hífen. As tarefas seguintes acrescentam aqui o texto de cada mensagem na hora em que a usam.
// Sinal explícito nos números da variação ("+12", "-12,5"), sem sinal no zero.
const formatadorDeVariacao = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
})
const formatadorDeContagem = new Intl.NumberFormat("pt-BR")

function textoDaVariacao(variacao: VariacaoPeriodo): string {
  if (variacao.tipo === "sem-periodo-anterior") {
    return "Sem período anterior para comparar."
  }
  if (variacao.tipo === "sem-bairros-comparaveis") {
    return `Sem bairros comparáveis com ${variacao.periodoAnterior}.`
  }
  const { absoluta, percentual, periodoAnterior, bairrosComparados } = variacao
  const comparando = `em relação a ${periodoAnterior}, comparando ${flexionar(bairrosComparados, "bairro", "bairros")}.`
  if (absoluta === 0) return `Sem variação ${comparando}`
  const casos = `${formatadorDeVariacao.format(absoluta)} ${Math.abs(absoluta) === 1 ? "caso" : "casos"}`
  const emPercentual =
    percentual === null ? "" : ` (${formatadorDeVariacao.format(percentual)}%)`
  return `${casos}${emPercentual} ${comparando}`
}

export const TEXTOS_SAUDE = {
  faixaSintetico:
    "Dados sintéticos: números fictícios criados para a demonstração.",
  taxa: "A taxa exige a população de cada bairro no período, que a demonstração não tem. Por isso mostramos contagens.",
  total: (bairrosComDados: number) =>
    bairrosComDados === 1
      ? "Soma de 1 bairro com dados no período."
      : `Soma dos ${bairrosComDados} bairros com dados no período.`,
  variacao: textoDaVariacao,
  cards: {
    resumo: "Resumo do período",
    periodo: (periodo: string) => `Período ${periodo}`,
    total: {
      titulo: "Total do período",
      semBairros: "Nenhum bairro tem dados no período.",
    },
    comDados: {
      titulo: "Bairros com dados",
      de: (totalDeBairros: number) => `de ${totalDeBairros} bairros`,
    },
    semDados: {
      titulo: "Bairros sem dados",
      descricao: "Sem registro no período; não entram no total.",
    },
    foraDaCobertura: {
      titulo: "Fora da cobertura",
      nenhum: "Nenhum registro no período.",
      detalhe: (localidades: number) =>
        `em ${flexionar(localidades, "localidade", "localidades")}, fora do total e fora do mapa`,
    },
    bairro: {
      titulo: "Bairro selecionado",
      uv: (uv: number) => `UV ${uv}`,
      zero: "Zero casos informados",
      semDados: "Sem dados no período",
      posicao: (posicao: number, totalNoRanking: number) =>
        `Posição ${posicao} de ${totalNoRanking} no ranking`,
      foraDoRanking: "Fora do ranking",
    },
    contagem: (valor: number) => formatadorDeContagem.format(valor),
    casos: (valor: number) =>
      `${formatadorDeContagem.format(valor)} ${valor === 1 ? "caso" : "casos"}`,
  },
  metodologia: {
    titulo: "Como os números são calculados",
    dataset: {
      nome: "Dataset",
      fonte: "Fonte",
      versao: "Versão",
      granularidade: "Granularidade",
      unidade: "Unidade",
      periodos: "Períodos",
    },
    granularidade: (granularidade: "ano" | "mes") =>
      granularidade === "ano" ? "anual" : "mensal",
    registro:
      "Cada número é uma contagem agregada por bairro e período, não um registro de paciente.",
    total:
      "O total soma só os bairros com dados no período; um zero informado conta como dado.",
    zeroSemDados:
      "Zero é um valor informado no arquivo. Sem dados é bairro sem linha ou com o campo vazio, e nunca vira zero. Fora da cobertura são os registros de localidades que não pertencem a nenhum bairro da sede: ficam à parte, fora do total e fora do mapa.",
    classes:
      "As classes do mapa são quantis (até 5) dos bairros com mais de zero casos no período; valores iguais ficam sempre na mesma classe.",
    variacao:
      "A variação compara o período em exibição com o imediatamente anterior do dataset, só nos bairros com dado nos dois períodos, e diz quantos entraram. O percentual só aparece quando a base é maior que zero.",
    sintetico:
      "Os dados são sintéticos, criados para a demonstração, e não são uma decisão oficial.",
  },
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
