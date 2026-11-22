import { GraficoRelatorio } from "@/components/relatorios/grafico-relatorio"
import { MapaRelatorio } from "@/components/relatorios/mapa-relatorio"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
const MOLDURA_DO_GRAFICO = {
  largura: 600,
  altura: 280,
  margem: { topo: 12, direita: 16, baixo: 32, esquerda: 48 },
} as const

type SecaoSaudePreviaProps = {
  saude: SecaoSaude
  territorio: SecaoTerritorio
  filtros: FiltrosDoRelatorio
  versaoPrivada: boolean
}

function Avisos({ versaoPrivada }: { versaoPrivada: boolean }) {
  return (
    <>
      <Alert>
        <AlertDescription>
          <strong>{TEXTOS_RELATORIOS.dadosSinteticos}</strong>:{" "}
          {TEXTOS_SAUDE.faixaSintetico}
        </AlertDescription>
      </Alert>
      {versaoPrivada ? (
        <Alert>
          <AlertDescription>
            {TEXTOS_RELATORIOS.versaoNaoPublicada}
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  )
}

function Dataset({ dataset }: { dataset: DatasetDoRelatorio }) {
  const linhas: [string, string][] = [
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
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      {linhas.map(([rotulo, valor]) => (
        <div key={rotulo} className="contents">
          <dt className="font-medium">{rotulo}</dt>
          <dd>{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

function Cartao({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div
      role="group"
      aria-label={titulo}
      className="flex flex-col gap-1 rounded-lg border p-3"
    >
      <h5 className="text-sm font-medium">{titulo}</h5>
      {children}
    </div>
  )
}

function textoDoCasos(casos: number | null): string {
  return casos === null ? TEXTOS.situacoes.semDados : CARDS.contagem(casos)
}

// Saúde (RF-05.10, RF-05.11, RF-05.15): os mesmos valores da tela, que vêm do mesmo `AnalisePeriodo`. Sem dataset, sem
// período ou sem dado do bairro, o texto diz o estado e a ausência nunca vira `0` (RN-05.03).
export function SecaoSaudePrevia({
  saude,
  territorio,
  filtros,
  versaoPrivada,
}: SecaoSaudePreviaProps) {
  return (
    <section aria-labelledby="previa-saude" className="flex flex-col gap-4">
      <h3 id="previa-saude" className="text-xl font-semibold">
        {TEXTOS_RELATORIOS.secoes.saude}
      </h3>
      <Avisos versaoPrivada={versaoPrivada} />
      {saude.estado === "nenhum-dataset" ? (
        <>
          <p role="status" className="font-medium">
            {TEXTOS.nenhumDataset}
          </p>
          <p className="text-sm text-muted-foreground">
            {TEXTOS.nenhumDatasetDetalhe}
          </p>
        </>
      ) : null}
      {saude.estado === "periodo-sem-dados" ? (
        <>
          <Dataset dataset={saude.dataset} />
          <p role="status" className="font-medium">
            {TEXTOS.periodoSemDados(saude.valor)}
          </p>
        </>
      ) : null}
      {saude.estado === "ok" ? (
        <SaudeComDados
          saude={saude}
          territorio={territorio}
          filtros={filtros}
        />
      ) : null}
    </section>
  )
}

type SaudeOk = Extract<SecaoSaude, { estado: "ok" }>

function SaudeComDados({
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
  const estilos = estilizarBairros(territorio.mapa, {
    destaqueId: bairro?.id ?? null,
    itens: analise.bairros,
  })
  const grafico = montarGraficoSvg(serie, MOLDURA_DO_GRAFICO)
  const { casos, bairrosComDados } = analise.total
  const { foraDaCobertura } = analise
  return (
    <>
      <Dataset dataset={dataset} />
      <p className="text-sm">
        {CARDS.periodo(periodo)}. {TEXTOS_SAUDE.taxa}
      </p>
      {saude.bairroSemDado ? (
        <p role="status" className="font-medium">
          {TEXTOS.bairroSemDado}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Cartao titulo={CARDS.total.titulo}>
          {bairrosComDados === 0 ? (
            <p>{CARDS.total.semBairros}</p>
          ) : (
            <>
              <p className="text-2xl font-semibold tabular-nums">
                {CARDS.casos(casos)}
              </p>
              <p className="text-sm text-muted-foreground">
                {TEXTOS_SAUDE.total(bairrosComDados)}
              </p>
            </>
          )}
          <p className="text-sm">{TEXTOS_SAUDE.variacao(variacao)}</p>
        </Cartao>
        <Cartao titulo={CARDS.comDados.titulo}>
          <p className="text-2xl font-semibold tabular-nums">
            {bairrosComDados}
          </p>
          <p className="text-sm text-muted-foreground">
            {CARDS.comDados.de(analise.bairros.length)}
          </p>
        </Cartao>
        <Cartao titulo={CARDS.semDados.titulo}>
          <p className="text-2xl font-semibold tabular-nums">
            {semDados.length}
          </p>
          <p className="text-sm text-muted-foreground">
            {CARDS.semDados.descricao}
          </p>
        </Cartao>
        <Cartao titulo={CARDS.foraDaCobertura.titulo}>
          <p className="text-sm">
            {foraDaCobertura.localidades === 0
              ? CARDS.foraDaCobertura.nenhum
              : `${flexionar(foraDaCobertura.casos, "caso", "casos")} ${CARDS.foraDaCobertura.detalhe(foraDaCobertura.localidades)}`}
          </p>
        </Cartao>
        {saude.destaqueDoBairro ? (
          <Cartao
            titulo={`${CARDS.bairro.titulo}: ${saude.destaqueDoBairro.item.bairro.nome}`}
          >
            <p className="text-2xl font-semibold tabular-nums">
              {saude.destaqueDoBairro.item.situacao === "zero"
                ? CARDS.bairro.zero
                : textoDoCasos(saude.destaqueDoBairro.item.casos)}
            </p>
            <p className="text-sm">
              {saude.destaqueDoBairro.posicao === null
                ? CARDS.bairro.foraDoRanking
                : CARDS.bairro.posicao(
                    saude.destaqueDoBairro.posicao,
                    saude.destaqueDoBairro.totalNoRanking
                  )}
            </p>
            <p className="text-sm">
              {TEXTOS_SAUDE.variacao(saude.destaqueDoBairro.variacao)}
            </p>
          </Cartao>
        ) : null}
      </div>

      <section
        aria-labelledby="previa-saude-mapa"
        className="flex flex-col gap-3"
      >
        <h4 id="previa-saude-mapa" className="text-lg font-semibold">
          {TEXTOS.mapa}
        </h4>
        <MapaRelatorio
          mapa={territorio.mapa}
          estilos={estilos}
          rotulo={`${dataset.indicador}, período ${periodo}`}
        />
        <ul
          aria-label={TEXTOS.legenda.titulo}
          className="flex flex-col gap-1.5 text-sm"
        >
          {analise.classes.classes.map(({ indice, rotulo }) => (
            <li key={indice} className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block size-4 shrink-0 rounded-sm border border-foreground/60"
                style={{ backgroundColor: CORES_COROPLETICO[indice - 1] }}
              />
              {rotulo}
            </li>
          ))}
          <li>{TEXTOS.legenda.zero}</li>
          <li>{TEXTOS.legenda.semDados}</li>
          {bairro ? <li>{TEXTOS.legenda.destaque}</li> : null}
          <li>{TEXTOS.legenda.metodo}</li>
        </ul>
        {analise.classes.classeUnica ? (
          <p className="text-sm">{TEXTOS_SAUDE.classeUnica}</p>
        ) : null}
      </section>

      <section
        aria-labelledby="previa-saude-tabela"
        className="flex flex-col gap-3"
      >
        <h4 id="previa-saude-tabela" className="text-lg font-semibold">
          {TEXTOS.tabela}
        </h4>
        <Table>
          <TableCaption className="sr-only">{TEXTOS.tabela}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>UV</TableHead>
              <TableHead>{TEXTOS.tabelaBairro}</TableHead>
              <TableHead>{TEXTOS.tabelaCasos}</TableHead>
              <TableHead>{TEXTOS.tabelaSituacao}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analise.bairros.map(({ bairro: item, casos: valor, situacao }) => (
              <TableRow key={item.id}>
                <TableCell>{item.uv}</TableCell>
                <TableCell>{item.nome}</TableCell>
                <TableCell className="tabular-nums">
                  {textoDoCasos(valor)}
                </TableCell>
                <TableCell>
                  {situacao === "valor"
                    ? TEXTOS.situacoes.valor
                    : situacao === "zero"
                      ? TEXTOS.situacoes.zero
                      : TEXTOS.situacoes.semDados}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section
        aria-labelledby="previa-saude-ranking"
        className="flex flex-col gap-3"
      >
        <h4 id="previa-saude-ranking" className="text-lg font-semibold">
          {TEXTOS.ranking}
        </h4>
        <ol className="flex list-decimal flex-col gap-1 pl-6 text-sm">
          {ranking.map(({ bairro: item, casos: valor }) => (
            <li key={item.id}>
              {item.nome}: {CARDS.casos(valor)}
            </li>
          ))}
        </ol>
        <p className="text-sm">{TEXTOS_SAUDE.regraRanking}</p>
        {semDados.length > 0 ? (
          <p className="text-sm">
            <span className="font-medium">{TEXTOS.semDadosNoPeriodo}:</span>{" "}
            {semDados.map(({ nome }) => nome).join(", ")}.
          </p>
        ) : null}
      </section>

      {serie.length > 1 ? (
        <section
          aria-labelledby="previa-saude-grafico"
          className="flex flex-col gap-3"
        >
          <h4 id="previa-saude-grafico" className="text-lg font-semibold">
            {TEXTOS.grafico}
          </h4>
          <p className="text-sm">
            {bairro ? TEXTOS.graficoDoBairro(bairro.nome) : TEXTOS.graficoTodos}
          </p>
          <GraficoRelatorio grafico={grafico} rotulo={TEXTOS.grafico} />
          {grafico.lacunas.length > 0 ? (
            <p className="text-sm">{TEXTOS.graficoLacunas(grafico.lacunas)}</p>
          ) : null}
          <ul
            aria-label={TEXTOS.grafico}
            className="flex flex-col gap-1 text-sm"
          >
            {serie.map(({ periodo: p, casos: valor }) => (
              <li key={p}>
                {p}: {textoDoCasos(valor)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        aria-labelledby="previa-saude-metodologia"
        className="flex flex-col gap-2"
      >
        <h4 id="previa-saude-metodologia" className="text-lg font-semibold">
          {METODOLOGIA.titulo}
        </h4>
        <ul className="flex list-disc flex-col gap-1 pl-6 text-sm">
          <li>{METODOLOGIA.registro}</li>
          <li>{METODOLOGIA.total}</li>
          <li>{METODOLOGIA.zeroSemDados}</li>
          <li>{METODOLOGIA.classes}</li>
          <li>{METODOLOGIA.variacao}</li>
          <li>{METODOLOGIA.sintetico}</li>
          <li>
            {METODOLOGIA.dataset.granularidade}:{" "}
            {METODOLOGIA.granularidade(dataset.granularidade)}
          </li>
        </ul>
      </section>
    </>
  )
}
