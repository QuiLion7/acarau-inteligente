import { Document, Page, Text, View } from "@react-pdf/renderer"

import { estilos } from "@/components/relatorios/pdf/estilos-pdf"
import { AvisoPdf, DadosPdf } from "@/components/relatorios/pdf/primitivas-pdf"
import { SecaoEducacaoPdf } from "@/components/relatorios/pdf/secao-educacao-pdf"
import { SecaoFontesPdf } from "@/components/relatorios/pdf/secao-fontes-pdf"
import { SecaoObrasPdf } from "@/components/relatorios/pdf/secao-obras-pdf"
import { SecaoSaudePdf } from "@/components/relatorios/pdf/secao-saude-pdf"
import { SecaoTerritorioPdf } from "@/components/relatorios/pdf/secao-territorio-pdf"
import { TEXTOS_RELATORIOS } from "@/lib/config/textos-relatorios"
import { formatarGeracao } from "@/lib/exportacao/data-geracao"
import type {
  FiltrosDoRelatorio,
  RelatorioDados,
} from "@/lib/relatorios/tipos-relatorio"

const TEXTOS = TEXTOS_RELATORIOS.cabecalho
function textoDoPeriodo({ periodo }: FiltrosDoRelatorio): string {
  if (periodo === null) return TEXTOS_RELATORIOS.semPeriodo
  if (periodo.tipo === "sem-dados") return periodo.valor
  return periodo.tipo === "padrao"
    ? TEXTOS_RELATORIOS.periodoMaisRecente(periodo.periodo)
    : periodo.periodo
}

type DocumentoRelatorioProps = { dados: RelatorioDados; geradoEm: Date }

// Documento do relatório (RF-05.07, RF-05.08, RF-05.16): A4, cabeçalho de identificação, aviso de demonstração no
// início, marca d'água "DEMONSTRAÇÃO" e rodapé com paginação em toda página (`fixed`), e as cinco seções na mesma ordem
// da prévia, a partir do mesmo `RelatorioDados`.
export function DocumentoRelatorio({
  dados,
  geradoEm,
}: DocumentoRelatorioProps) {
  const { filtros } = dados
  return (
    <Document
      title={TEXTOS_RELATORIOS.titulo}
      author={dados.autor}
      subject={TEXTOS_RELATORIOS.avisoRodape}
      language="pt-BR"
    >
      <Page size="A4" style={estilos.pagina}>
        <Text fixed style={estilos.marcaDagua}>
          {TEXTOS_RELATORIOS.marcaDagua}
        </Text>

        <View style={estilos.corpo}>
          <Text style={estilos.titulo}>{TEXTOS_RELATORIOS.titulo}</Text>
          <AvisoPdf>{TEXTOS_RELATORIOS.avisoDemonstracao}</AvisoPdf>
          {dados.versaoPrivada ? (
            <AvisoPdf>{TEXTOS_RELATORIOS.versaoNaoPublicada}</AvisoPdf>
          ) : null}
          <DadosPdf
            itens={[
              [TEXTOS.geradoEm, formatarGeracao(geradoEm)],
              [
                TEXTOS.bairro,
                filtros.bairro?.nome ?? TEXTOS_RELATORIOS.todosOsBairros,
              ],
              [TEXTOS.periodo, textoDoPeriodo(filtros)],
              [TEXTOS.universo, dados.universo],
              [TEXTOS.geradoPor, dados.autor],
              [TEXTOS.versaoApp, dados.versaoApp],
            ]}
          />

          <SecaoTerritorioPdf
            territorio={dados.territorio}
            bairro={filtros.bairro}
          />
          <SecaoSaudePdf
            saude={dados.saude}
            territorio={dados.territorio}
            filtros={filtros}
            versaoPrivada={dados.versaoPrivada}
          />
          <SecaoEducacaoPdf educacao={dados.educacao} bairro={filtros.bairro} />
          <SecaoObrasPdf obras={dados.obras} />
          <SecaoFontesPdf fontes={dados.fontes} />
        </View>

        <Text fixed style={estilos.rodapeTexto}>
          {TEXTOS_RELATORIOS.avisoRodape}
        </Text>
        <Text
          fixed
          style={estilos.rodapePagina}
          render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          }
        />
      </Page>
    </Document>
  )
}
