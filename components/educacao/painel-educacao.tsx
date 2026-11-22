"use client"

import type { Map as MapaMapLibre } from "maplibre-gl"
import { useState } from "react"

import { CardsEducacao } from "@/components/educacao/cards-educacao"
import { MetodologiaEducacao } from "@/components/educacao/metodologia-educacao"
import { QuadroPendencias } from "@/components/educacao/quadro-pendencias"
import { TabelaEscolasPorBairro } from "@/components/educacao/tabela-escolas-por-bairro"
import { EstadoInterface } from "@/components/estados/estado-interface"
import { BotaoBaixarMapa } from "@/components/exportacao/botao-baixar-mapa"
import { LinkExportarRelatorio } from "@/components/relatorios/link-exportar-relatorio"
import { FichaEscola } from "@/components/territorio/ficha-escola"
import { LegendaMapa } from "@/components/territorio/legenda-mapa"
import { MapaTerritorioDinamico } from "@/components/territorio/mapa-territorio-dinamico"
import { SeletorBairro } from "@/components/territorio/seletor-bairro"
import { TabelaEscolas } from "@/components/territorio/tabela-escolas"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useFiltroBairro } from "@/hooks/use-filtro-bairro"
import { TEXTOS_EDUCACAO } from "@/lib/config/textos-educacao"
import {
  legendaDasEscolas,
  legendaDosBairros,
} from "@/lib/exportacao/legendas-png"
import { montarMolduraPng } from "@/lib/exportacao/moldura-png"
import type {
  Bairro,
  Escola,
  LimiteMunicipal,
  QualidadeEscolas,
} from "@/lib/territorio/artefato-schema"
import type { IdCamadaControlavel } from "@/lib/territorio/estilo-mapa"
import { contarMarcadores } from "@/lib/territorio/filtro-escolas"

// Mapa da Educação: bairros, limite e escolas sempre ligados, sem controle de camadas (DEC-T-08).
const CAMADAS_FIXAS: ReadonlySet<IdCamadaControlavel> = new Set([
  "bairros",
  "limite-municipal",
  "escolas",
])

type PainelEducacaoProps = {
  bairros: Bairro[]
  limite: LimiteMunicipal
  escolas: Escola[]
  qualidade: QualidadeEscolas
  regraFronteira: string
  fonte: string
  dataReferencia: string
}

// Composição da Educação (RF-03.13 a RF-03.17, RF-03.19): o bairro escolhido vive na URL e é o mesmo da Saúde e do
// Território (RN-03.05); o `periodo` não é lido aqui e o `useFiltroBairro` o preserva (RN-03.10). A escola aberta é
// estado local e a ficha abre num `Sheet`, do mapa ou da lista (DEC-T-07).
export function PainelEducacao({
  bairros,
  limite,
  escolas,
  qualidade,
  regraFronteira,
  fonte,
  dataReferencia,
}: PainelEducacaoProps) {
  const { selecao, selecionar, limpar } = useFiltroBairro(bairros)
  const [codigoEscolaAberta, setCodigoEscolaAberta] = useState<string | null>(
    null
  )
  const [mapa, setMapa] = useState<MapaMapLibre | null>(null)
  const bairroSelecionado =
    selecao.tipo === "bairro"
      ? (bairros.find(({ id }) => id === selecao.bairro.id) ?? null)
      : null
  const escolaAberta =
    escolas.find(({ codigoInep }) => codigoInep === codigoEscolaAberta) ?? null
  const bairroDaEscola = bairros.find(({ id }) => id === escolaAberta?.bairroId)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SeletorBairro
          id="seletor-bairro"
          bairros={bairros}
          selecao={selecao}
          onSelecionar={selecionar}
          onLimpar={limpar}
        />
        <LinkExportarRelatorio />
      </div>
      {selecao.tipo === "nao-reconhecido" ? (
        <EstadoInterface
          tipo="bairro-nao-reconhecido"
          acao={
            <Button type="button" onClick={limpar}>
              Limpar bairro
            </Button>
          }
        />
      ) : null}
      <CardsEducacao
        qualidade={qualidade}
        bairroSelecionado={bairroSelecionado}
        fonte={fonte}
        dataReferencia={dataReferencia}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
        <section
          aria-labelledby="titulo-mapa-escolas"
          className="flex min-w-0 flex-col gap-4"
        >
          <h2 id="titulo-mapa-escolas" className="text-xl font-semibold">
            {TEXTOS_EDUCACAO.secoes.mapa}
          </h2>
          <MapaTerritorioDinamico
            bairros={bairros}
            limite={limite}
            escolas={escolas}
            selecionadoId={bairroSelecionado?.id ?? null}
            camadasLigadas={CAMADAS_FIXAS}
            onSelecionar={selecionar}
            onAbrirEscola={setCodigoEscolaAberta}
            rotulo="Mapa das escolas por bairro de Acaraú"
            aoCarregar={setMapa}
          />
          <div className="flex justify-end">
            <BotaoBaixarMapa
              mapa={mapa}
              moldura={montarMolduraPng({
                titulo: "Educação - escolas por bairro",
                bairro: bairroSelecionado?.nome ?? null,
                legenda: [
                  ...legendaDosBairros(bairroSelecionado !== null),
                  ...legendaDasEscolas(),
                ],
                sintetico: false,
              })}
              tipo="mapa-educacao"
              bairro={bairroSelecionado?.nome}
            />
          </div>
          <LegendaMapa marcadoresDeEscola={contarMarcadores(escolas)} />
        </section>
        <TabelaEscolasPorBairro
          bairros={bairros}
          qualidade={qualidade}
          selecionadoId={bairroSelecionado?.id ?? null}
          onSelecionar={selecionar}
        />
      </div>
      <section
        aria-labelledby="titulo-lista-escolas"
        className="flex flex-col gap-3"
      >
        <h2 id="titulo-lista-escolas" className="text-xl font-semibold">
          {TEXTOS_EDUCACAO.secoes.lista}
        </h2>
        <TabelaEscolas
          escolas={escolas}
          bairros={bairros}
          bairroSelecionado={bairroSelecionado}
          fonte={fonte}
          dataReferencia={dataReferencia}
          onAbrirEscola={setCodigoEscolaAberta}
          comBusca
        />
      </section>
      <QuadroPendencias qualidade={qualidade} />
      <MetodologiaEducacao
        regraFronteira={regraFronteira}
        fonte={fonte}
        dataReferencia={dataReferencia}
      />
      <Sheet
        open={escolaAberta !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setCodigoEscolaAberta(null)
        }}
      >
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{TEXTOS_EDUCACAO.ficha.titulo}</SheetTitle>
            <SheetDescription>
              {TEXTOS_EDUCACAO.ficha.descricao}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            {escolaAberta ? (
              <FichaEscola
                escola={escolaAberta}
                bairroNome={bairroDaEscola?.nome ?? null}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
