// Data e hora de geração de um arquivo (PDF, PNG), sempre no horário de Brasília (R-09): o relógio do aparelho dá o
// instante, não o fuso.
const formatadorDeGeracao = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
})

/** "22/11/2026 10:53 (horário de Brasília)". */
export function formatarGeracao(geradoEm: Date): string {
  return `${formatadorDeGeracao.format(geradoEm).replace(", ", " ")} (horário de Brasília)`
}
