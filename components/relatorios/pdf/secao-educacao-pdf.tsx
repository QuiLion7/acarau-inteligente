import {
  CartaoPdf,
  CartoesPdf,
  ListaPdf,
  ParagrafoPdf,
  SecaoPdf,
  SubtituloPdf,
  TabelaPdf,
} from "@/components/relatorios/pdf/primitivas-pdf"
import { TEXTOS_EDUCACAO } from "@/lib/config/textos-educacao"
import { TEXTOS_RELATORIOS } from "@/lib/config/textos-relatorios"
import type {
  EscolaPendente,
  FiltrosDoRelatorio,
  SecaoEducacao,
} from "@/lib/relatorios/tipos-relatorio"

const TEXTOS = TEXTOS_RELATORIOS.educacao
const CARDS = TEXTOS_EDUCACAO.cards

function itensDaPendencia(escolas: readonly EscolaPendente[]): string[] {
  return escolas.length === 0
    ? [TEXTOS.nenhuma]
    : escolas.map(({ nome, codigoInep }) => `${nome} (${codigoInep})`)
}

// Educação (RF-05.12): os números do artefato, sem recontar (DV-37), a escola fora do limite à parte (DV-39) e, sem a
// camada de escolas, "fonte ausente" no lugar dos números (RN-03.12). Mesmo conteúdo da prévia.
export function SecaoEducacaoPdf({
  educacao,
  bairro,
}: {
  educacao: SecaoEducacao
  bairro: FiltrosDoRelatorio["bairro"]
}) {
  const { cards, pendencias } = educacao
  return (
    <SecaoPdf titulo={TEXTOS_RELATORIOS.secoes.educacao}>
      {educacao.fonte === null ? (
        <ParagrafoPdf negrito>{TEXTOS.fonteAusente}</ParagrafoPdf>
      ) : (
        <>
          <ParagrafoPdf>
            {TEXTOS_EDUCACAO.fonteEData(
              educacao.fonte,
              educacao.dataReferencia ?? TEXTOS_RELATORIOS.naoInformada
            )}
          </ParagrafoPdf>
          <CartoesPdf>
            <CartaoPdf
              titulo={CARDS.registros.titulo}
              valor={String(cards.totalCatalogo)}
              linhas={[CARDS.registros.detalhe]}
            />
            <CartaoPdf
              titulo={CARDS.georreferenciadas.titulo}
              valor={String(cards.comLocalizacao)}
              linhas={[CARDS.georreferenciadas.detalhe]}
            />
            <CartaoPdf
              titulo={CARDS.semLocalizacao.titulo}
              valor={String(cards.semLocalizacao)}
              linhas={[CARDS.semLocalizacao.detalhe]}
            />
            <CartaoPdf
              titulo={CARDS.dentroDosBairros.titulo}
              valor={String(cards.dentroDeBairros)}
              linhas={[CARDS.dentroDosBairros.detalhe]}
            />
            <CartaoPdf
              titulo={CARDS.foraDaCobertura.titulo}
              valor={String(cards.foraDaCobertura)}
              linhas={[CARDS.foraDaCobertura.detalhe(cards.foraDoLimite)]}
            />
          </CartoesPdf>

          <SubtituloPdf>{TEXTOS.porBairro}</SubtituloPdf>
          <TabelaPdf
            colunas={[
              { titulo: "UV", largura: 1 },
              { titulo: TEXTOS.porBairroBairro, largura: 6 },
              { titulo: TEXTOS.porBairroTotal, largura: 4 },
            ]}
            linhas={educacao.porBairro.map(({ bairro: item, total }) => [
              String(item.uv),
              item.nome,
              total === 0 ? TEXTOS_EDUCACAO.tabela.semEscola : String(total),
            ])}
          />

          {bairro && educacao.escolasDoBairro ? (
            <>
              <SubtituloPdf>{TEXTOS.escolasDoBairro(bairro.nome)}</SubtituloPdf>
              {educacao.escolasDoBairro.length === 0 ? (
                <ParagrafoPdf>{TEXTOS.nenhumaEscolaNoBairro}</ParagrafoPdf>
              ) : (
                <TabelaPdf
                  colunas={[
                    { titulo: TEXTOS.escolasColunas.codigo, largura: 2 },
                    { titulo: TEXTOS.escolasColunas.nome, largura: 6 },
                    { titulo: TEXTOS.escolasColunas.dependencia, largura: 2 },
                    { titulo: TEXTOS.escolasColunas.localizacao, largura: 2 },
                  ]}
                  linhas={educacao.escolasDoBairro.map((escola) => [
                    escola.codigoInep,
                    escola.nome,
                    escola.dependencia,
                    escola.localizacao,
                  ])}
                />
              )}
            </>
          ) : null}

          <SubtituloPdf>{TEXTOS.pendencias}</SubtituloPdf>
          <ParagrafoPdf negrito>{TEXTOS.pendenciasSemLocalizacao}</ParagrafoPdf>
          <ListaPdf itens={itensDaPendencia(pendencias.semLocalizacao)} />
          <ParagrafoPdf>
            {TEXTOS.pendenciasForaDaCobertura(pendencias.foraDaCobertura)}
          </ParagrafoPdf>
          <ParagrafoPdf negrito>{TEXTOS.pendenciasForaDoLimite}</ParagrafoPdf>
          <ListaPdf itens={itensDaPendencia(pendencias.foraDoLimite)} />
          <ParagrafoPdf suave>
            {TEXTOS_EDUCACAO.pendencias.naoInventa}
          </ParagrafoPdf>
        </>
      )}
    </SecaoPdf>
  )
}
