import {
  AvisoPdf,
  DadosPdf,
  ParagrafoPdf,
  SecaoPdf,
  SubtituloPdf,
  TabelaPdf,
} from "@/components/relatorios/pdf/primitivas-pdf"
import { TEXTOS_OBRAS } from "@/lib/config/textos-obras"
import { TEXTOS_RELATORIOS } from "@/lib/config/textos-relatorios"
import { ROTULO_SITUACAO_OBRA, SITUACOES_OBRA } from "@/lib/obras/situacao-obra"
import { formatarData, formatarValorEmReais } from "@/lib/obras/valores-obra"
import type { SecaoObras } from "@/lib/relatorios/tipos-relatorio"

const TEXTOS = TEXTOS_RELATORIOS.obras

// Obras (RF-05.13): faixa de dados sintéticos, resumo por situação e lista do filtro, com SINTETICO em cada obra e o
// aviso de que valor previsto não é valor pago (RN-021). Mesmo conteúdo da prévia.
export function SecaoObrasPdf({ obras }: { obras: SecaoObras }) {
  const { resumo } = obras
  const colunas = [
    { titulo: TEXTOS.colunas.obra, largura: 5 },
    { titulo: TEXTOS.colunas.situacao, largura: 2 },
    { titulo: TEXTOS.colunas.bairro, largura: 3 },
    { titulo: TEXTOS.colunas.dataPrevista, largura: 2 },
    ...(obras.temValor
      ? [{ titulo: TEXTOS_OBRAS.valorPrevisto.rotulo, largura: 3 }]
      : []),
    { titulo: TEXTOS.colunas.origem, largura: 2 },
  ]
  return (
    <SecaoPdf titulo={TEXTOS_RELATORIOS.secoes.obras}>
      <AvisoPdf>{`${TEXTOS_RELATORIOS.dadosSinteticos}: ${TEXTOS_OBRAS.faixaSintetico}`}</AvisoPdf>
      <SubtituloPdf>{TEXTOS.resumo}</SubtituloPdf>
      <DadosPdf
        itens={[
          [TEXTOS.total, String(resumo.total)],
          ...SITUACOES_OBRA.map((situacao): [string, string] => [
            ROTULO_SITUACAO_OBRA[situacao],
            String(resumo.porSituacao[situacao]),
          ]),
          [TEXTOS.semLocalizacao, String(resumo.semLocalizacao)],
        ]}
      />
      <SubtituloPdf>{TEXTOS.lista}</SubtituloPdf>
      {obras.lista.length === 0 ? (
        <ParagrafoPdf>{TEXTOS.nenhuma}</ParagrafoPdf>
      ) : (
        <TabelaPdf
          colunas={colunas}
          linhas={obras.lista.map((obra) => [
            obra.titulo,
            ROTULO_SITUACAO_OBRA[obra.situacao],
            obra.bairro,
            obra.dataPrevista
              ? formatarData(obra.dataPrevista)
              : TEXTOS.semDataPrevista,
            ...(obras.temValor
              ? [
                  obra.valorPrevistoCentavos === null
                    ? TEXTOS_OBRAS.naoInformado
                    : formatarValorEmReais(obra.valorPrevistoCentavos),
                ]
              : []),
            obra.proveniencia,
          ])}
        />
      )}
      {obras.temValor ? (
        <ParagrafoPdf negrito>{TEXTOS.valorPrevisto}</ParagrafoPdf>
      ) : null}
    </SecaoPdf>
  )
}
