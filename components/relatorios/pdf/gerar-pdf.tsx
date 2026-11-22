import { pdf } from "@react-pdf/renderer"

import { DocumentoRelatorio } from "@/components/relatorios/pdf/documento-relatorio"
import { registrarFontes } from "@/components/relatorios/pdf/fontes-pdf"
import type { RelatorioDados } from "@/lib/relatorios/tipos-relatorio"
import { nomeArquivo } from "@/lib/relatorios/nome-arquivo"

/**
 * Gera o PDF no navegador a partir do mesmo `RelatorioDados` da prévia (DEC-T-01). Carregado só por `import()` no clique
 * em "Gerar PDF": o `@react-pdf/renderer` e as fontes não entram no bundle inicial de `/relatorios`. `geradoEm` é o
 * instante do clique (o modelo não tem data, TechSpec §4.1).
 */
export async function gerarPdfRelatorio(
  dados: RelatorioDados,
  geradoEm: Date
): Promise<{ blob: Blob; nome: string }> {
  await registrarFontes()
  const blob = await pdf(
    <DocumentoRelatorio dados={dados} geradoEm={geradoEm} />
  ).toBlob()
  return {
    blob,
    nome: nomeArquivo({
      tipo: "relatorio",
      data: geradoEm,
      bairro: dados.filtros.bairro?.nome,
      extensao: "pdf",
    }),
  }
}
