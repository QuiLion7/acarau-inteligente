import {
  DadosPdf,
  ListaPdf,
  ParagrafoPdf,
  SecaoPdf,
  SubtituloPdf,
} from "@/components/relatorios/pdf/primitivas-pdf"
import { TEXTOS_RELATORIOS } from "@/lib/config/textos-relatorios"
import { formatarInstante } from "@/lib/obras/valores-obra"
import type { SecaoFontes } from "@/lib/relatorios/tipos-relatorio"

const TEXTOS = TEXTOS_RELATORIOS.fontes

// Fontes e limitações (RF-05.14): camadas, datasets publicados e obras com a proveniência de cada um, a atribuição do
// OpenStreetMap (RN-029) e as limitações. Mesmo conteúdo da prévia.
export function SecaoFontesPdf({ fontes }: { fontes: SecaoFontes }) {
  return (
    <SecaoPdf titulo={TEXTOS_RELATORIOS.secoes.fontes}>
      <SubtituloPdf>{TEXTOS.camadas}</SubtituloPdf>
      {fontes.camadas.map((camada) => (
        <DadosPdf
          key={camada.id}
          itens={[
            [TEXTOS.camadaColunas.nome, camada.nome],
            [TEXTOS.camadaColunas.fonte, camada.fonte],
            [TEXTOS.camadaColunas.etiqueta, camada.etiqueta],
            [TEXTOS.camadaColunas.versao, camada.versao],
            [TEXTOS.camadaColunas.dataReferencia, camada.dataReferencia],
          ]}
        />
      ))}
      <SubtituloPdf>{TEXTOS.datasets}</SubtituloPdf>
      {fontes.datasets.length === 0 ? (
        <ParagrafoPdf>{TEXTOS.datasetsNenhum}</ParagrafoPdf>
      ) : (
        <ListaPdf
          itens={fontes.datasets.map(({ nome, versao, publicadoEm }) => {
            const publicado = publicadoEm
              ? `, ${TEXTOS.publicadoEm(formatarInstante(publicadoEm))}`
              : ""
            return `${TEXTOS.datasetVersao(nome, versao)}${publicado} - SINTETICO`
          })}
        />
      )}
      <SubtituloPdf>{TEXTOS.obras}</SubtituloPdf>
      <ParagrafoPdf>
        {`${TEXTOS.obrasResumo(
          fontes.obras.quantidade,
          fontes.obras.ultimaAtualizacao
            ? formatarInstante(fontes.obras.ultimaAtualizacao)
            : null
        )} SINTETICO.`}
      </ParagrafoPdf>
      <SubtituloPdf>{TEXTOS.limitacoes}</SubtituloPdf>
      <ListaPdf
        itens={fontes.camadas.flatMap((camada) =>
          camada.limitacoes.map((limitacao) => `${camada.nome}: ${limitacao}`)
        )}
      />
      <ParagrafoPdf>{TEXTOS.atribuicao}</ParagrafoPdf>
    </SecaoPdf>
  )
}
