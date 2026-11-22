"use client"

import type { Map as MapaMapLibre } from "maplibre-gl"
import { useRef, useState } from "react"

import { EstadoInterface } from "@/components/estados/estado-interface"
import { BotaoBaixarMapa } from "@/components/exportacao/botao-baixar-mapa"
import { ControleCamadas } from "@/components/territorio/controle-camadas"
import { FichaBairro } from "@/components/territorio/ficha-bairro"
import { LegendaMapa } from "@/components/territorio/legenda-mapa"
import { ListaBairros } from "@/components/territorio/lista-bairros"
import { MapaTerritorioDinamico } from "@/components/territorio/mapa-territorio-dinamico"
import { PainelEscolas } from "@/components/territorio/painel-escolas"
import { QuadroQualidadeEscolas } from "@/components/territorio/quadro-qualidade-escolas"
import { TabelaBairros } from "@/components/territorio/tabela-bairros"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useFiltroBairro } from "@/hooks/use-filtro-bairro"
import { CAMADAS_CARREGADAS } from "@/lib/config/camadas-carregadas"
import type {
  Bairro,
  Escola,
  LimiteMunicipal,
  QualidadeEscolas,
} from "@/lib/territorio/artefato-schema"
import {
  CAMADAS_CONTROLAVEIS,
  type IdCamadaControlavel,
} from "@/lib/territorio/estilo-mapa"
import {
  legendaDasEscolas,
  legendaDosBairros,
} from "@/lib/exportacao/legendas-png"
import { montarMolduraPng } from "@/lib/exportacao/moldura-png"
import { contarMarcadores } from "@/lib/territorio/filtro-escolas"

// O controle só oferece camada que o mapa desenha e que a carga gravou (RN-005, CA-01.06).
const CAMADAS_DO_CONTROLE = CAMADAS_CONTROLAVEIS.filter(({ id }) =>
  CAMADAS_CARREGADAS.some((camada) => camada.id === id)
)

// Fonte e data de referência das escolas vêm do catálogo de camadas carregadas, o mesmo que "Fontes e limitações".
const CAMADA_ESCOLAS = CAMADAS_CARREGADAS.find(({ id }) => id === "escolas")

type AbaPainel = "bairros" | "ficha" | "escolas"

function ehAbaPainel(valor: unknown): valor is AbaPainel {
  return valor === "bairros" || valor === "ficha" || valor === "escolas"
}

type ExploradorTerritorioProps = {
  bairros: Bairro[]
  limite: LimiteMunicipal
  escolas: Escola[]
  qualidade: QualidadeEscolas
}

// Painel do Território (RF-01.11): lista, ficha e tabela falam entre si pela URL (`bairro`). A aba aberta é estado
// de tela e fica local (DV-12): só o bairro é filtro global.
export function ExploradorTerritorio({
  bairros,
  limite,
  escolas,
  qualidade,
}: ExploradorTerritorioProps) {
  const { selecao, selecionar, limpar } = useFiltroBairro(bairros)
  const selecionado =
    selecao.tipo === "bairro"
      ? (bairros.find((bairro) => bairro.id === selecao.bairro.id) ?? null)
      : null
  const [aba, setAba] = useState<AbaPainel>(selecionado ? "ficha" : "bairros")
  const [camadasLigadas, setCamadasLigadas] = useState<
    ReadonlySet<IdCamadaControlavel>
  >(
    () =>
      new Set(
        CAMADAS_DO_CONTROLE.filter(({ ligadaDeInicio }) => ligadaDeInicio).map(
          ({ id }) => id
        )
      )
  )
  const [codigoEscolaAberta, setCodigoEscolaAberta] = useState<string | null>(
    null
  )
  const [mapa, setMapa] = useState<MapaMapLibre | null>(null)
  const escolaAberta =
    escolas.find(({ codigoInep }) => codigoInep === codigoEscolaAberta) ?? null
  // Seleção pela lista tira o botão da tela; o foco vai ao título da ficha quando ela monta (RF-02.46).
  const focoNaFichaPendenteRef = useRef(false)

  function handleAlternarCamada(id: IdCamadaControlavel) {
    setCamadasLigadas((atuais) => {
      const proximas = new Set(atuais)
      if (!proximas.delete(id)) proximas.add(id)
      return proximas
    })
  }

  function handleSelecionar(idBairro: string) {
    selecionar(idBairro)
    setAba("ficha")
  }

  function handleSelecionarDaLista(idBairro: string) {
    focoNaFichaPendenteRef.current = true
    handleSelecionar(idBairro)
  }

  function focarTituloDaFicha(titulo: HTMLHeadingElement | null) {
    if (!titulo || !focoNaFichaPendenteRef.current) return
    focoNaFichaPendenteRef.current = false
    titulo.focus()
  }

  function handleAbrirEscola(codigoInep: string) {
    setCodigoEscolaAberta(codigoInep)
    setAba("escolas")
  }

  function handleLimpar() {
    limpar()
    setAba("bairros")
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section
          aria-labelledby="titulo-mapa"
          className="flex min-w-0 flex-col gap-4"
        >
          <h2 id="titulo-mapa" className="sr-only">
            Mapa dos bairros
          </h2>
          <MapaTerritorioDinamico
            bairros={bairros}
            limite={limite}
            escolas={escolas}
            selecionadoId={selecionado?.id ?? null}
            camadasLigadas={camadasLigadas}
            onSelecionar={handleSelecionar}
            onAbrirEscola={handleAbrirEscola}
            aoCarregar={setMapa}
          />
          <div className="flex justify-end">
            <BotaoBaixarMapa
              mapa={mapa}
              moldura={montarMolduraPng({
                titulo: "Território - bairros e escolas",
                bairro: selecionado?.nome ?? null,
                legenda: [
                  ...legendaDosBairros(selecionado !== null),
                  ...(camadasLigadas.has("escolas") ? legendaDasEscolas() : []),
                ],
                sintetico: false,
              })}
              tipo="mapa-territorio"
              bairro={selecionado?.nome}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ControleCamadas
              camadas={CAMADAS_DO_CONTROLE}
              ligadas={camadasLigadas}
              onAlternar={handleAlternarCamada}
            />
            <LegendaMapa
              marcadoresDeEscola={
                camadasLigadas.has("escolas") ? contarMarcadores(escolas) : null
              }
            />
          </div>
        </section>
        <Tabs
          value={aba}
          onValueChange={(valor) => ehAbaPainel(valor) && setAba(valor)}
          className="min-w-0"
        >
          <TabsList>
            <TabsTrigger value="bairros">Bairros</TabsTrigger>
            <TabsTrigger value="ficha">Ficha do bairro</TabsTrigger>
            {CAMADA_ESCOLAS ? (
              <TabsTrigger value="escolas">Escolas</TabsTrigger>
            ) : null}
          </TabsList>
          <TabsContent value="bairros" className="pt-2">
            <ListaBairros
              bairros={bairros}
              selecionadoId={selecionado?.id ?? null}
              onSelecionar={handleSelecionarDaLista}
            />
          </TabsContent>
          <TabsContent value="ficha" className="pt-2">
            {selecionado ? (
              <div className="flex flex-col gap-4">
                <FichaBairro
                  bairro={selecionado}
                  tituloRef={focarTituloDaFicha}
                />
                <Button
                  variant="outline"
                  className="self-start"
                  onClick={handleLimpar}
                >
                  Limpar seleção
                </Button>
              </div>
            ) : (
              <EstadoInterface
                tipo="vazio"
                titulo="Nenhum bairro selecionado"
                descricao="Escolha um bairro na lista ou na tabela para ver a ficha."
              />
            )}
          </TabsContent>
          {CAMADA_ESCOLAS ? (
            <TabsContent value="escolas" className="pt-2">
              <PainelEscolas
                escolas={escolas}
                bairros={bairros}
                bairroSelecionado={selecionado}
                escolaAberta={escolaAberta}
                fonte={CAMADA_ESCOLAS.fonte}
                dataReferencia={CAMADA_ESCOLAS.dataReferencia}
                onAbrirEscola={handleAbrirEscola}
                onFecharEscola={() => setCodigoEscolaAberta(null)}
              />
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
      {CAMADA_ESCOLAS ? (
        <QuadroQualidadeEscolas
          qualidade={qualidade}
          fonte={CAMADA_ESCOLAS.fonte}
          dataReferencia={CAMADA_ESCOLAS.dataReferencia}
        />
      ) : null}
      <section
        aria-labelledby="titulo-tabela-bairros"
        className="flex flex-col gap-3"
      >
        <h2 id="titulo-tabela-bairros" className="text-xl font-semibold">
          Bairros da sede
        </h2>
        <TabelaBairros
          bairros={bairros}
          selecionadoId={selecionado?.id ?? null}
          onSelecionar={handleSelecionar}
        />
      </section>
    </div>
  )
}
