import { GraficoPdf, MapaPdf } from "@/components/relatorios/pdf/svg-pdf"
import { estilos } from "@/components/relatorios/pdf/estilos-pdf"
import {
  AvisoPdf,
  CartaoPdf,
  CartoesPdf,
  DadosPdf,
  ListaPdf,
  ParagrafoPdf,
  SecaoPdf,
  SubtituloPdf,
  TabelaPdf,
} from "@/components/relatorios/pdf/primitivas-pdf"
import { Text, View } from "@react-pdf/renderer"
import { TEXTOS_RELATORIOS } from "@/lib/config/textos-relatorios"
import { TEXTOS_SAUDE } from "@/lib/config/textos-saude"
import { formatarInstante } from "@/lib/obras/valores-obra"
import { montarGraficoSvg } from "@/lib/relatorios/grafico-svg"
import { estilizarBairros } from "@/lib/relatorios/mapa-svg"
import type {
  DatasetDoRelatorio,
  FiltrosDoRelatorio,
  SecaoSaude,
  SecaoTerritorio,
} from "@/lib/relatorios/tipos-relatorio"
import { CORES_COROPLETICO } from "@/lib/territorio/estilo-mapa"
import { flexionar } from "@/lib/territorio/formato"

const TEXTOS = TEXTOS_RELATORIOS.saude
const CARDS = TEXTOS_SAUDE.cards
const METODOLOGIA = TEXTOS_SAUDE.metodologia
// A mesma moldura do gráfico da prévia: o desenho é o mesmo nos dois.
const MOLDURA_DO_GRAFICO = {
  largura: 600,
  altura: 280,
  margem: { topo: 12, direita: 16, baixo: 32, esquerda: 48 },
} as const

type SecaoSaudePdfProps = {
  saude: SecaoSaude
  territorio: SecaoTerritorio
  filtros: FiltrosDoRelatorio
  versaoPrivada: boolean
}

function dadosDoDataset(dataset: DatasetDoRelatorio): [string, string][] {
  return [
    [TEXTOS.dataset, dataset.nome],
    [TEXTOS.indicador, dataset.indicador],
    [TEXTOS.fonte, dataset.fonte],
    [TEXTOS.versao, String(dataset.versaoNumero)],
    [TEXTOS.importadoEm, formatarInstante(dataset.importadoEm)],
    [
      TEXTOS.situacao,
      dataset.publicada ? TEXTOS.publicada : TEXTOS.naoPublicada,
    ],
  ]
}

function textoDosCasos(casos: number | null): string {
  return casos === null ? TEXTOS.situacoes.semDados : CARDS.contagem(casos)
}

function textoDaSituacao(situacao: "valor" | "zero" | "sem-dados"): string {
  if (situacao === "valor") return TEXTOS.situacoes.valor
  return situacao === "zero" ? TEXTOS.situacoes.zero : TEXTOS.situacoes.semDados
}

type SaudeOk = Extract<SecaoSaude, { estado: "ok" }>

function SaudeComDadosPdf({
  saude,
  territorio,
  filtros,
}: {
  saude: SaudeOk
  territorio: SecaoTerritorio
  filtros: FiltrosDoRelatorio
}) {
  const { dataset, periodo, analise, ranking, semDados, serie, variacao } =
    saude
  const bairro = filtros.bairro
  const estilosDosBairros = estilizarBairros(territorio.mapa, {
    destaqueId: bairro?.id ?? null,
    itens: analise.bairros,
  })
  const grafico = montarGraficoSvg(serie, MOLDURA_DO_GRAFICO)
  const { casos, bairrosComDados } = analise.total
  const { foraDaCobertura } = analise
  const destaque = saude.destaqueDoBairro
  return (
    <>
      <DadosPdf itens={dadosDoDataset(dataset)} />
      <ParagrafoPdf>{`${CARDS.periodo(periodo)}. ${TEXTOS_SAUDE.taxa}`}</ParagrafoPdf>
      {saude.bairroSemDado ? (
        <ParagrafoPdf negrito>{TEXTOS.bairroSemDado}</ParagrafoPdf>
      ) : null}

      <CartoesPdf>
        <CartaoPdf
          titulo={CARDS.total.titulo}
          valor={bairrosComDados === 0 ? undefined : CARDS.casos(casos)}
          linhas={[
            bairrosComDados === 0
              ? CARDS.total.semBairros
              : TEXTOS_SAUDE.total(bairrosComDados),
            TEXTOS_SAUDE.variacao(variacao),
          ]}
        />
        <CartaoPdf
          titulo={CARDS.comDados.titulo}
          valor={String(bairrosComDados)}
          linhas={[CARDS.comDados.de(analise.bairros.length)]}
        />
        <CartaoPdf
          titulo={CARDS.semDados.titulo}
          valor={String(semDados.length)}
          linhas={[CARDS.semDados.descricao]}
        />
        <CartaoPdf
          titulo={CARDS.foraDaCobertura.titulo}
          linhas={[
            foraDaCobertura.localidades === 0
              ? CARDS.foraDaCobertura.nenhum
              : `${flexionar(foraDaCobertura.casos, "caso", "casos")} ${CARDS.foraDaCobertura.detalhe(foraDaCobertura.localidades)}`,
          ]}
        />
        {destaque ? (
          <CartaoPdf
            titulo={`${CARDS.bairro.titulo}: ${destaque.item.bairro.nome}`}
            valor={
              destaque.item.situacao === "zero"
                ? CARDS.bairro.zero
                : textoDosCasos(destaque.item.casos)
            }
            linhas={[
              destaque.posicao === null
                ? CARDS.bairro.foraDoRanking
                : CARDS.bairro.posicao(
                    destaque.posicao,
                    destaque.totalNoRanking
                  ),
              TEXTOS_SAUDE.variacao(destaque.variacao),
            ]}
          />
        ) : null}
      </CartoesPdf>

      <SubtituloPdf>{TEXTOS.mapa}</SubtituloPdf>
      <ParagrafoPdf
        suave
      >{`${dataset.indicador}, período ${periodo}`}</ParagrafoPdf>
      <MapaPdf mapa={territorio.mapa} estilosDosBairros={estilosDosBairros} />
      <View wrap={false} style={{ marginBottom: 4 }}>
        <Text style={estilos.negrito}>{TEXTOS.legenda.titulo}</Text>
        {analise.classes.classes.map(({ indice, rotulo }) => (
          <View key={indice} style={estilos.item}>
            <View
              style={[
                estilos.amostra,
                { backgroundColor: CORES_COROPLETICO[indice - 1] },
              ]}
            />
            <Text style={estilos.itemTexto}>{rotulo}</Text>
          </View>
        ))}
        <ListaPdf
          itens={[
            TEXTOS.legenda.zero,
            TEXTOS.legenda.semDados,
            ...(bairro ? [TEXTOS.legenda.destaque] : []),
            TEXTOS.legenda.metodo,
          ]}
        />
      </View>
      {analise.classes.classeUnica ? (
        <ParagrafoPdf>{TEXTOS_SAUDE.classeUnica}</ParagrafoPdf>
      ) : null}

      <SubtituloPdf>{TEXTOS.tabela}</SubtituloPdf>
      <TabelaPdf
        colunas={[
          { titulo: "UV", largura: 1 },
          { titulo: TEXTOS.tabelaBairro, largura: 5 },
          { titulo: TEXTOS.tabelaCasos, largura: 2 },
          { titulo: TEXTOS.tabelaSituacao, largura: 3 },
        ]}
        linhas={analise.bairros.map(
          ({ bairro: item, casos: valor, situacao }) => [
            String(item.uv),
            item.nome,
            textoDosCasos(valor),
            textoDaSituacao(situacao),
          ]
        )}
      />

      <SubtituloPdf>{TEXTOS.ranking}</SubtituloPdf>
      <ListaPdf
        itens={ranking.map(
          ({ bairro: item, casos: valor }, indice) =>
            `${indice + 1}. ${item.nome}: ${CARDS.casos(valor)}`
        )}
      />
      <ParagrafoPdf suave>{TEXTOS_SAUDE.regraRanking}</ParagrafoPdf>
      {semDados.length > 0 ? (
        <ParagrafoPdf>{`${TEXTOS.semDadosNoPeriodo}: ${semDados.map(({ nome }) => nome).join(", ")}.`}</ParagrafoPdf>
      ) : null}

      {serie.length > 1 ? (
        <>
          <SubtituloPdf>{TEXTOS.grafico}</SubtituloPdf>
          <ParagrafoPdf suave>
            {bairro ? TEXTOS.graficoDoBairro(bairro.nome) : TEXTOS.graficoTodos}
          </ParagrafoPdf>
          <GraficoPdf grafico={grafico} />
          {grafico.lacunas.length > 0 ? (
            <ParagrafoPdf>
              {TEXTOS.graficoLacunas(grafico.lacunas)}
            </ParagrafoPdf>
          ) : null}
          <ListaPdf
            itens={serie.map(
              ({ periodo: p, casos: valor }) => `${p}: ${textoDosCasos(valor)}`
            )}
          />
        </>
      ) : null}

      <SubtituloPdf>{METODOLOGIA.titulo}</SubtituloPdf>
      <ListaPdf
        itens={[
          METODOLOGIA.registro,
          METODOLOGIA.total,
          METODOLOGIA.zeroSemDados,
          METODOLOGIA.classes,
          METODOLOGIA.variacao,
          METODOLOGIA.sintetico,
          `${METODOLOGIA.dataset.granularidade}: ${METODOLOGIA.granularidade(dataset.granularidade)}`,
        ]}
      />
    </>
  )
}

// Saúde (RF-05.10, RF-05.11, RF-05.15): o texto, os números e o desenho da prévia. Sem dataset, sem período ou sem dado
// do bairro, o estado vem escrito e a ausência nunca vira `0` (RN-05.03).
export function SecaoSaudePdf({
  saude,
  territorio,
  filtros,
  versaoPrivada,
}: SecaoSaudePdfProps) {
  return (
    <SecaoPdf titulo={TEXTOS_RELATORIOS.secoes.saude}>
      <AvisoPdf>{`${TEXTOS_RELATORIOS.dadosSinteticos}: ${TEXTOS_SAUDE.faixaSintetico}`}</AvisoPdf>
      {versaoPrivada ? (
        <AvisoPdf>{TEXTOS_RELATORIOS.versaoNaoPublicada}</AvisoPdf>
      ) : null}
      {saude.estado === "nenhum-dataset" ? (
        <>
          <ParagrafoPdf negrito>{TEXTOS.nenhumDataset}</ParagrafoPdf>
          <ParagrafoPdf suave>{TEXTOS.nenhumDatasetDetalhe}</ParagrafoPdf>
        </>
      ) : null}
      {saude.estado === "periodo-sem-dados" ? (
        <>
          <DadosPdf itens={dadosDoDataset(saude.dataset)} />
          <ParagrafoPdf negrito>
            {TEXTOS.periodoSemDados(saude.valor)}
          </ParagrafoPdf>
        </>
      ) : null}
      {saude.estado === "ok" ? (
        <SaudeComDadosPdf
          saude={saude}
          territorio={territorio}
          filtros={filtros}
        />
      ) : null}
    </SecaoPdf>
  )
}
