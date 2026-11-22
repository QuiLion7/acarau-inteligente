"use client"

import type { Map as MapaMapLibre } from "maplibre-gl"
import { useMemo, useRef, useState } from "react"
import { flushSync } from "react-dom"

import { EstadoInterface } from "@/components/estados/estado-interface"
import { BotaoBaixarMapa } from "@/components/exportacao/botao-baixar-mapa"
import { FichaObra } from "@/components/obras/ficha-obra"
import { FiltroSituacao } from "@/components/obras/filtro-situacao"
import { FormObra, type ControleDoFormObra } from "@/components/obras/form-obra"
import { LegendaObras } from "@/components/obras/legenda-obras"
import { MetodologiaObras } from "@/components/obras/metodologia-obras"
import { ResumoObras } from "@/components/obras/resumo-obras"
import { LinkExportarRelatorio } from "@/components/relatorios/link-exportar-relatorio"
import { TabelaObras, idDoBotaoDaObra } from "@/components/obras/tabela-obras"
import { MapaTerritorioDinamico } from "@/components/territorio/mapa-territorio-dinamico"
import { SeletorBairro } from "@/components/territorio/seletor-bairro"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useFiltroBairro } from "@/hooks/use-filtro-bairro"
import { useFiltroSituacao } from "@/hooks/use-filtro-situacao"
import { useParametroNovaObra } from "@/hooks/use-parametro-nova-obra"
import { TEXTOS_OBRAS } from "@/lib/config/textos-obras"
import {
  legendaDasObras,
  legendaDosBairros,
} from "@/lib/exportacao/legendas-png"
import { montarMolduraPng } from "@/lib/exportacao/moldura-png"
import { filtrarObras, resumirObras } from "@/lib/obras/filtro-obras"
import { ROTULO_SITUACAO_OBRA } from "@/lib/obras/situacao-obra"
import type { Bairro, LimiteMunicipal } from "@/lib/territorio/artefato-schema"
import type { IdCamadaControlavel } from "@/lib/territorio/estilo-mapa"
import {
  contarMarcadoresDeObras,
  obrasNoMapa,
} from "@/lib/territorio/geojson-mapa"
import type { Obra, PontoObra } from "@/lib/validations/obra-schema"

// Mapa de Obras: bairros e limite ligados, sem controle de camadas (as obras têm camada própria).
const CAMADAS_FIXAS: ReadonlySet<IdCamadaControlavel> = new Set([
  "bairros",
  "limite-municipal",
])

type ModoDoPainel =
  { tipo: "lista" } | { tipo: "nova" } | { tipo: "editar"; obraId: string }

type PainelObrasProps = {
  obras: Obra[]
  bairros: Bairro[]
  limite: LimiteMunicipal
  regraFronteira: string
  /** Analista ou administrador: só eles veem "Nova obra" e "Editar" (RF-04.14); o servidor confere de novo. */
  podeEditar: boolean
  /** `/obras?nova=1` (só vale com `podeEditar`): o painel abre direto no formulário de nova obra. */
  abrirNova: boolean
  /** `/obras?obra=<uuid>` (destino do link da auditoria, RF-05.28): a ficha dessa obra abre ao carregar. */
  obraInicialId?: string | null
}

// Composição de Obras (RF-04.01 a RF-04.13): faixa sintética, resumo, filtros, mapa e lista, metodologia. Os filtros
// de situação (`situacao`, local) e de bairro (global, DV-12) vivem na URL e se aplicam, juntos, ao mesmo array que
// alimenta resumo, mapa e lista (RF-04.07). A obra selecionada é estado local: sobrevive ao `router.refresh()`.
export function PainelObras({
  obras,
  bairros,
  limite,
  regraFronteira,
  podeEditar,
  abrirNova,
  obraInicialId = null,
}: PainelObrasProps) {
  const { selecao, selecionar, limpar: limparBairro } = useFiltroBairro(bairros)
  const { situacoes, definir, limparComBairro } = useFiltroSituacao()
  const [obraSelecionadaId, setObraSelecionadaId] = useState<string | null>(
    obraInicialId
  )
  const [fichaAberta, setFichaAberta] = useState(obraInicialId !== null)
  const [modo, setModo] = useState<ModoDoPainel>(
    podeEditar && abrirNova ? { tipo: "nova" } : { tipo: "lista" }
  )
  const [pontoProvisorio, setPontoProvisorio] = useState<PontoObra | null>(null)
  const [mapa, setMapa] = useState<MapaMapLibre | null>(null)
  const formRef = useRef<ControleDoFormObra>(null)
  const novaObraRef = useRef<HTMLButtonElement>(null)
  const { remover: removerNovaDaUrl } = useParametroNovaObra()
  const territorio = useMemo(
    () => ({ limite: limite.geometria.coordinates, bairros }),
    [limite, bairros]
  )

  const bairroId = selecao.tipo === "bairro" ? selecao.bairro.id : null
  const filtradas = useMemo(
    () => filtrarObras(obras, { situacoes, bairroId }),
    [obras, situacoes, bairroId]
  )
  const resumo = useMemo(() => resumirObras(filtradas), [filtradas])
  const noMapa = useMemo(() => obrasNoMapa(filtradas), [filtradas])
  const obraAberta = obras.find(({ id }) => id === obraSelecionadaId) ?? null
  const haFiltro = situacoes.length > 0 || bairroId !== null

  const obraEmEdicao =
    modo.tipo === "editar"
      ? (obras.find(({ id }) => id === modo.obraId) ?? null)
      : null

  function handleAbrirObra(obraId: string) {
    setObraSelecionadaId(obraId)
    setFichaAberta(true)
  }

  function handleNovaObra() {
    setFichaAberta(false)
    setPontoProvisorio(null)
    setModo({ tipo: "nova" })
  }

  // "Editar" na ficha fecha o `Sheet` e abre o formulário na coluna; o foco vai ao título dele ao montar.
  function handleEditar() {
    if (obraAberta === null) return
    setFichaAberta(false)
    setPontoProvisorio(obraAberta.localizacao)
    setModo({ tipo: "editar", obraId: obraAberta.id })
  }

  // Fecha o formulário e devolve o foco: à linha da obra editada, ou a "Nova obra" (RNF-04.01). O `flushSync` faz a
  // lista voltar ao DOM antes de o foco ser procurado, no próprio handler (sem `useEffect`).
  function fecharFormulario() {
    const obraEditadaId = modo.tipo === "editar" ? modo.obraId : null
    flushSync(() => {
      setPontoProvisorio(null)
      setModo({ tipo: "lista" })
    })
    removerNovaDaUrl()
    const alvo =
      obraEditadaId === null
        ? novaObraRef.current
        : document.getElementById(idDoBotaoDaObra(obraEditadaId))
    alvo?.focus()
  }

  function handleSalvo(obra: Obra) {
    setObraSelecionadaId(obra.id)
    fecharFormulario()
  }

  return (
    <div className="flex flex-col gap-8">
      <Alert>
        <AlertDescription>{TEXTOS_OBRAS.faixaSintetico}</AlertDescription>
      </Alert>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <LinkExportarRelatorio />
        {podeEditar ? (
          <Button ref={novaObraRef} type="button" onClick={handleNovaObra}>
            {TEXTOS_OBRAS.acoes.novaObra}
          </Button>
        ) : null}
      </div>
      <ResumoObras resumo={resumo} />
      <section
        aria-labelledby="titulo-filtros-obras"
        className="flex flex-col gap-4"
      >
        <h2 id="titulo-filtros-obras" className="sr-only">
          {TEXTOS_OBRAS.secoes.filtros}
        </h2>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-8">
          <FiltroSituacao situacoes={situacoes} onChange={definir} />
          <SeletorBairro
            id="seletor-bairro"
            bairros={bairros}
            selecao={selecao}
            onSelecionar={selecionar}
            onLimpar={limparBairro}
          />
        </div>
        {selecao.tipo === "nao-reconhecido" ? (
          <EstadoInterface
            tipo="bairro-nao-reconhecido"
            acao={
              <Button type="button" onClick={limparBairro}>
                Limpar bairro
              </Button>
            }
          />
        ) : null}
      </section>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
        <section
          aria-labelledby="titulo-mapa-obras"
          className="flex min-w-0 flex-col gap-4"
        >
          <h2 id="titulo-mapa-obras" className="text-xl font-semibold">
            {TEXTOS_OBRAS.secoes.mapa}
          </h2>
          <MapaTerritorioDinamico
            bairros={bairros}
            limite={limite}
            selecionadoId={bairroId}
            camadasLigadas={CAMADAS_FIXAS}
            onSelecionar={selecionar}
            obras={noMapa}
            obraSelecionadaId={obraSelecionadaId}
            onAbrirObra={handleAbrirObra}
            pontoProvisorio={pontoProvisorio}
            aoCarregar={setMapa}
            onEscolherPonto={
              modo.tipo === "lista"
                ? undefined
                : (ponto) => formRef.current?.definirPonto(ponto)
            }
            rotulo="Mapa das obras por bairro de Acaraú"
          />
          <LegendaObras
            marcadoresPorSituacao={contarMarcadoresDeObras(noMapa)}
          />
          <div className="flex justify-end">
            <BotaoBaixarMapa
              mapa={mapa}
              moldura={montarMolduraPng({
                titulo: "Obras - mapa por situação",
                bairro: selecao.tipo === "bairro" ? selecao.bairro.nome : null,
                outrosFiltros:
                  situacoes.length > 0
                    ? [
                        `Situação: ${situacoes.map((situacao) => ROTULO_SITUACAO_OBRA[situacao]).join(", ")}`,
                      ]
                    : [],
                legenda: [
                  ...legendaDosBairros(selecao.tipo === "bairro"),
                  ...legendaDasObras(),
                ],
                sintetico: true,
              })}
              tipo="mapa-obras"
              bairro={selecao.tipo === "bairro" ? selecao.bairro.nome : null}
            />
          </div>
        </section>
        {modo.tipo === "lista" ? (
          // Sem `aria-labelledby`: a área rolável da lista é a região nomeada; duas regiões com o mesmo nome confundiriam.
          <section className="flex min-w-0 flex-col gap-4">
            <h2 className="text-xl font-semibold">
              {TEXTOS_OBRAS.secoes.lista}
            </h2>
            <ListaOuEstadoVazio
              obras={obras}
              filtradas={filtradas}
              bairros={bairros}
              obraSelecionadaId={obraSelecionadaId}
              haFiltro={haFiltro}
              bairroNome={
                selecao.tipo === "bairro" ? selecao.bairro.nome : null
              }
              onAbrirObra={handleAbrirObra}
              onLimparFiltros={limparComBairro}
            />
          </section>
        ) : (
          <section className="flex min-w-0 flex-col gap-4">
            <FormObra
              // Obra diferente é formulário novo: o estado de uma não vaza para a outra.
              key={modo.tipo === "editar" ? modo.obraId : "nova"}
              ref={formRef}
              obra={obraEmEdicao}
              territorio={territorio}
              onSalvo={handleSalvo}
              onCancelar={fecharFormulario}
              onPontoProvisorioChange={setPontoProvisorio}
            />
          </section>
        )}
      </div>
      <MetodologiaObras regraFronteira={regraFronteira} />
      <Sheet
        open={fichaAberta && obraAberta !== null}
        onOpenChange={setFichaAberta}
      >
        <SheetContent
          className="overflow-y-auto"
          // A obra pode ter sido aberta pelo marcador (canvas): ao fechar, o foco volta ao botão dela na lista.
          finalFocus={() =>
            obraSelecionadaId
              ? (document.getElementById(idDoBotaoDaObra(obraSelecionadaId)) ??
                true)
              : true
          }
        >
          <SheetHeader>
            <SheetTitle>{TEXTOS_OBRAS.ficha.titulo}</SheetTitle>
            <SheetDescription>{TEXTOS_OBRAS.ficha.descricao}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {obraAberta ? (
              <FichaObra
                obra={obraAberta}
                bairros={bairros}
                onEditar={podeEditar ? handleEditar : undefined}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

type ListaOuEstadoVazioProps = {
  obras: readonly Obra[]
  filtradas: readonly Obra[]
  bairros: readonly Pick<Bairro, "id" | "nome">[]
  obraSelecionadaId: string | null
  haFiltro: boolean
  bairroNome: string | null
  onAbrirObra: (obraId: string) => void
  onLimparFiltros: () => void
}

// Os dois vazios são diferentes: sem obra nenhuma não há o que limpar; com filtro, a ação limpa situação e bairro.
function ListaOuEstadoVazio({
  obras,
  filtradas,
  bairros,
  obraSelecionadaId,
  haFiltro,
  bairroNome,
  onAbrirObra,
  onLimparFiltros,
}: ListaOuEstadoVazioProps) {
  if (obras.length === 0) {
    return <EstadoInterface tipo="vazio" titulo={TEXTOS_OBRAS.vazio.semObras} />
  }
  if (filtradas.length === 0) {
    return (
      <EstadoInterface
        tipo="vazio"
        titulo={TEXTOS_OBRAS.vazio.comFiltros}
        acao={
          haFiltro ? (
            <Button onClick={onLimparFiltros}>
              {TEXTOS_OBRAS.vazio.limparFiltros}
            </Button>
          ) : undefined
        }
      />
    )
  }
  return (
    <TabelaObras
      obras={filtradas}
      bairros={bairros}
      obraSelecionadaId={obraSelecionadaId}
      onAbrirObra={onAbrirObra}
      bairroNome={bairroNome}
    />
  )
}
