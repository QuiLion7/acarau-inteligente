"use client"

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import Link from "next/link"
import { Fragment } from "react"

import { EstadoInterface } from "@/components/estados/estado-interface"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DetalhesAuditoria } from "@/lib/auditoria/eventos-auditoria"
import type {
  EventoAuditoria,
  PaginaAuditoria,
} from "@/lib/auditoria/tipos-auditoria"
import { useParametrosAuditoria } from "@/hooks/use-parametros-auditoria"
import { TEXTOS_AUDITORIA } from "@/lib/config/textos-auditoria"
import { formatarInstante } from "@/lib/obras/valores-obra"

const TEXTOS = TEXTOS_AUDITORIA.tabela
const { colunas: ROTULOS } = TEXTOS
const TAMANHO_ID_CURTO = 8
const SEM_EVENTOS: readonly EventoAuditoria[] = []

/** Destino do alvo na tela do próprio objeto (RF-05.28). */
function destinoDoAlvo(alvo: NonNullable<EventoAuditoria["alvo"]>): string {
  return alvo.tipo === "obra"
    ? `/obras?obra=${alvo.id}`
    : `/saude?versao=${alvo.id}`
}

function CelulaAlvo({ alvo }: { alvo: EventoAuditoria["alvo"] }) {
  if (alvo === null) return TEXTOS.semAlvo
  const nome = `${TEXTOS.alvos[alvo.tipo]} ${alvo.id.slice(0, TAMANHO_ID_CURTO)}`
  if (!alvo.existe) {
    return (
      <span>
        {nome}{" "}
        <span className="text-muted-foreground">
          ({TEXTOS.removidoPeloReset})
        </span>
      </span>
    )
  }
  return (
    <Link href={destinoDoAlvo(alvo)} className="underline underline-offset-4">
      {nome}
    </Link>
  )
}

function textoDoDetalhe(valor: DetalhesAuditoria[string]): string {
  if (typeof valor === "boolean") {
    return valor
      ? TEXTOS_AUDITORIA.simNao.verdadeiro
      : TEXTOS_AUDITORIA.simNao.falso
  }
  return String(valor)
}

function DetalheDoEvento({ evento }: { evento: EventoAuditoria }) {
  const itens = Object.entries(evento.detalhes)
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      {evento.alvo ? (
        <>
          <dt className="text-muted-foreground">{ROTULOS.alvo}</dt>
          <dd className="break-all">
            {TEXTOS.alvos[evento.alvo.tipo]} {evento.alvo.id}
          </dd>
        </>
      ) : null}
      {itens.map(([campo, valor]) => (
        <Fragment key={campo}>
          <dt className="text-muted-foreground">
            {TEXTOS_AUDITORIA.detalhes[campo] ?? campo}
          </dt>
          <dd>{textoDoDetalhe(valor)}</dd>
        </Fragment>
      ))}
      {itens.length === 0 && evento.alvo === null ? (
        <dd className="col-span-2">{TEXTOS.semDetalhes}</dd>
      ) : null}
    </dl>
  )
}

// Colunas fora do componente: referência estável (react-next §7). A coluna "detalhes" é desenhada pela tabela, que é
// quem sabe expandir a linha.
const COLUNAS: ColumnDef<EventoAuditoria>[] = [
  {
    id: "quando",
    header: ROTULOS.quando,
    cell: ({ row: { original } }) => formatarInstante(original.ocorridoEm),
  },
  { accessorKey: "contaRotulo", header: ROTULOS.conta },
  { accessorKey: "rotulo", header: ROTULOS.evento },
  {
    id: "alvo",
    header: ROTULOS.alvo,
    cell: ({ row: { original } }) => <CelulaAlvo alvo={original.alvo} />,
  },
  {
    id: "resultado",
    header: ROTULOS.resultado,
    cell: ({ row: { original } }) => (
      <Badge
        variant={original.resultado === "sucesso" ? "secondary" : "outline"}
      >
        {TEXTOS.resultados[original.resultado]}
      </Badge>
    ),
  },
  { id: "detalhes", header: ROTULOS.detalhes },
]

type TabelaAuditoriaProps = {
  pagina: PaginaAuditoria
  haFiltro: boolean
}

// Tabela da auditoria (RF-05.26): paginação no servidor (`manualPagination`), uma linha por evento e o detalhe
// expansível na linha de baixo. É a única forma de ver o evento: não há endpoint de leitura (DEC-T-11).
export function TabelaAuditoria({ pagina, haFiltro }: TabelaAuditoriaProps) {
  const { limparFiltros, irParaPagina } = useParametrosAuditoria()
  // eslint-disable-next-line react-hooks/incompatible-library
  const tabela = useReactTable({
    data:
      pagina.eventos.length > 0
        ? pagina.eventos
        : (SEM_EVENTOS as EventoAuditoria[]),
    columns: COLUNAS,
    getRowId: (evento) => evento.id,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    manualPagination: true,
    pageCount: pagina.paginas,
  })

  if (pagina.total === 0) {
    return (
      <EstadoInterface
        tipo="vazio"
        titulo={
          haFiltro
            ? TEXTOS_AUDITORIA.vazio.comFiltros
            : TEXTOS_AUDITORIA.vazio.semEventos
        }
        descricao={
          haFiltro ? "Tente outros filtros ou limpe os atuais." : undefined
        }
        acao={
          haFiltro ? (
            <Button type="button" onClick={limparFiltros}>
              {TEXTOS_AUDITORIA.filtros.limpar}
            </Button>
          ) : undefined
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        // Área rolável focável: sem isso quem usa só o teclado não rola a tabela larga (WCAG 2.1.1).
        tabIndex={0}
        role="region"
        aria-label="Eventos de auditoria"
        className="overflow-auto rounded-lg border"
      >
        <Table>
          <TableCaption className="sr-only">{TEXTOS.legenda}</TableCaption>
          <TableHeader>
            {tabela.getHeaderGroups().map((grupo) => (
              <TableRow key={grupo.id}>
                {grupo.headers.map((cabecalho) => (
                  <TableHead key={cabecalho.id}>
                    {flexRender(
                      cabecalho.column.columnDef.header,
                      cabecalho.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {tabela.getRowModel().rows.map((linha) => (
              <Fragment key={linha.id}>
                <TableRow>
                  {linha.getVisibleCells().map((celula) => (
                    <TableCell key={celula.id}>
                      {celula.column.id === "detalhes" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-expanded={linha.getIsExpanded()}
                          aria-controls={`detalhe-evento-${linha.id}`}
                          onClick={linha.getToggleExpandedHandler()}
                        >
                          {linha.getIsExpanded()
                            ? TEXTOS.ocultarDetalhes
                            : TEXTOS.mostrarDetalhes}
                        </Button>
                      ) : (
                        flexRender(
                          celula.column.columnDef.cell,
                          celula.getContext()
                        )
                      )}
                    </TableCell>
                  ))}
                </TableRow>
                {linha.getIsExpanded() ? (
                  <TableRow id={`detalhe-evento-${linha.id}`}>
                    <TableCell colSpan={COLUNAS.length} className="bg-muted/40">
                      <DetalheDoEvento evento={linha.original} />
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm">
          {TEXTOS.total(pagina.total)} -{" "}
          {TEXTOS.pagina(pagina.pagina, pagina.paginas)}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pagina.pagina <= 1}
            onClick={() => irParaPagina(pagina.pagina - 1)}
          >
            {TEXTOS.anterior}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pagina.pagina >= pagina.paginas}
            onClick={() => irParaPagina(pagina.pagina + 1)}
          >
            {TEXTOS.proxima}
          </Button>
        </div>
      </div>
    </div>
  )
}
