"use client"

import type { ReactNode } from "react"

import { EstadoInterface } from "@/components/estados/estado-interface"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useRelatorio } from "@/hooks/query/use-datasets"
import {
  formatarDataHora,
  rotuloDosPeriodos,
} from "@/lib/datasets/formato-versao"
import type { RelatorioImportacao as DadosDoRelatorio } from "@/lib/importacao/relatorio-schema"
import type { RelatorioVersao } from "@/lib/validations/datasets-schema"

type Decisao = DadosDoRelatorio["decisoesBairro"][number]

const ROTULO_DA_ORIGEM = { automatica: "Automática", manual: "Manual" } as const

function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-semibold">{titulo}</h3>
      <dl className="grid grid-cols-2 gap-3">{children}</dl>
    </section>
  )
}

function destinoDaDecisao({ destino }: Decisao): string {
  return destino.tipo === "bairro"
    ? `${destino.nome} (${destino.bairroId})`
    : "Fora da cobertura"
}

function DecisoesDeBairro({ decisoes }: { decisoes: readonly Decisao[] }) {
  if (decisoes.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-semibold">Decisões de bairro</h3>
      <Table>
        <TableCaption className="sr-only">
          Como cada nome do arquivo foi associado a um bairro
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-normal">Nome no arquivo</TableHead>
            <TableHead className="whitespace-normal">Associado a</TableHead>
            <TableHead className="whitespace-normal">Origem</TableHead>
            <TableHead className="text-right whitespace-normal">
              Linhas
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {decisoes.map((decisao) => (
            <TableRow key={decisao.nomeOriginal}>
              <TableCell className="whitespace-normal">
                {decisao.nomeOriginal}
              </TableCell>
              <TableCell className="whitespace-normal">
                {destinoDaDecisao(decisao)}
              </TableCell>
              <TableCell className="whitespace-normal">
                {ROTULO_DA_ORIGEM[decisao.origem]}
              </TableCell>
              <TableCell className="text-right whitespace-normal tabular-nums">
                {decisao.linhas}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}

// Relatório de processamento (RF-02.23, CA-02.16): tudo o que a importação decidiu e contou, sem as linhas do arquivo.
function ConteudoDoRelatorio({ dados }: { dados: RelatorioVersao }) {
  const { versao, dataset, relatorio } = dados
  const { mapeamento, contagens } = relatorio
  return (
    // Região rolável: o foco do teclado entra nela para quem não usa mouse conseguir rolar o relatório.
    <div
      role="region"
      aria-label="Conteúdo do relatório"
      tabIndex={0}
      className="flex flex-col gap-6 overflow-y-auto px-4 pb-6 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <Grupo titulo="Dataset">
        <Item rotulo="Nome">{dataset.nome}</Item>
        <Item rotulo="Indicador">{dataset.indicador}</Item>
        <Item rotulo="Fonte">{dataset.fonte}</Item>
        <Item rotulo="Unidade">{dataset.unidade}</Item>
        <Item rotulo="Proveniência">
          <Badge variant="secondary">{dataset.proveniencia}</Badge>
        </Item>
      </Grupo>
      <Grupo titulo="Versão">
        <Item rotulo="Versão">{versao.numero}</Item>
        <Item rotulo="Situação">
          {versao.situacao === "publicado" ? "Publicado" : "Privado"}
        </Item>
        <Item rotulo="Autor">{versao.autor}</Item>
        <Item rotulo="Importado em">
          {formatarDataHora(versao.importadoEm)}
        </Item>
        <Item rotulo="Publicado em">
          {versao.publicadoEm ? formatarDataHora(versao.publicadoEm) : "-"}
        </Item>
        <Item rotulo="Períodos">{rotuloDosPeriodos(relatorio.periodos)}</Item>
        <Item rotulo="Granularidade">
          {relatorio.granularidade === "ano" ? "Ano" : "Mês"}
        </Item>
      </Grupo>
      <Grupo titulo="Arquivo">
        <Item rotulo="Nome do arquivo">{relatorio.nomeArquivo}</Item>
        <Item rotulo="Separador">
          {relatorio.separador === ";" ? "Ponto e vírgula (;)" : "Vírgula (,)"}
        </Item>
        <Item rotulo="Encoding">{relatorio.encoding}</Item>
        <Item rotulo="Identificação do conteúdo (SHA-256)">
          <span className="font-mono text-xs break-all">
            {relatorio.hashConteudo}
          </span>
        </Item>
      </Grupo>
      <Grupo titulo="Colunas">
        <Item rotulo="Bairro">{mapeamento.bairro}</Item>
        <Item rotulo="Período">{mapeamento.periodo}</Item>
        <Item rotulo="Casos">{mapeamento.casos}</Item>
        <Item rotulo="Ignoradas">
          {relatorio.colunasIgnoradas.length === 0
            ? "Nenhuma"
            : relatorio.colunasIgnoradas.join(", ")}
        </Item>
      </Grupo>
      <Grupo titulo="Linhas">
        <Item rotulo="Lidas">{contagens.lidas}</Item>
        <Item rotulo="Gravadas">{contagens.gravadas}</Item>
        <Item rotulo="Sem dado">{contagens.semDado}</Item>
        <Item rotulo="Fora da cobertura">{contagens.foraDaCobertura}</Item>
        <Item rotulo="Com aviso">{contagens.avisos}</Item>
      </Grupo>
      <DecisoesDeBairro decisoes={relatorio.decisoesBairro} />
    </div>
  )
}

type RelatorioImportacaoProps = {
  /** `null` = fechado: nada é consultado. */
  versaoId: string | null
  onFechar: () => void
}

export function RelatorioImportacao({
  versaoId,
  onFechar,
}: RelatorioImportacaoProps) {
  const relatorio = useRelatorio(versaoId)

  return (
    <Sheet
      open={versaoId !== null}
      onOpenChange={(aberto) => {
        if (!aberto) onFechar()
      }}
    >
      <SheetContent side="right" className="data-[side=right]:sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Relatório de processamento</SheetTitle>
          <SheetDescription>
            O que a importação leu, decidiu e gravou. Os dados são sintéticos.
          </SheetDescription>
        </SheetHeader>
        {relatorio.isLoading ? <EstadoInterface tipo="carregando" /> : null}
        {relatorio.isError ? (
          <EstadoInterface tipo="erro" descricao={relatorio.error.message} />
        ) : null}
        {relatorio.data ? <ConteudoDoRelatorio dados={relatorio.data} /> : null}
      </SheetContent>
    </Sheet>
  )
}
