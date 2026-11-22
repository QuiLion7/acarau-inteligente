"use client"

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { useState } from "react"

import { BotaoExportarCsv } from "@/components/exportacao/botao-exportar-csv"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ItemBairroPeriodo } from "@/lib/saude/analise-periodo"
import { colunasCsvCasosBairros } from "@/lib/saude/csv-casos-bairros"
import { cn } from "@/lib/utils"

const formatadorDeNumero = new Intl.NumberFormat("pt-BR")

const COLUNAS: ColumnDef<ItemBairroPeriodo>[] = [
  { id: "uv", header: "UV", accessorFn: ({ bairro }) => bairro.uv },
  { id: "nome", header: "Bairro", accessorFn: ({ bairro }) => bairro.nome },
  {
    id: "casos",
    header: "Casos",
    // `undefined` ordena por último nos dois sentidos: "sem dados" nunca vira zero nem fica entre os valores.
    accessorFn: ({ casos }) => casos ?? undefined,
    sortUndefined: "last",
    cell: ({ getValue }) => {
      const casos = getValue<number | undefined>()
      return casos === undefined ? (
        <span className="text-muted-foreground">sem dados</span>
      ) : (
        <span className="tabular-nums">{formatadorDeNumero.format(casos)}</span>
      )
    },
  },
]

const ORDEM_INICIAL: SortingState = [{ id: "uv", desc: false }]
const ICONE_DA_ORDEM = { asc: ArrowUp, desc: ArrowDown } as const
const SENTIDO_ARIA = { asc: "ascending", desc: "descending" } as const

type TabelaCasosBairrosProps = {
  /** Período e proveniência do dataset, para o CSV (RF-05.21); sem eles a tabela não oferece exportar. */
  exportacao?: { periodo: string; proveniencia: string; bairro: string | null }
  itens: ItemBairroPeriodo[]
  selecionadoId: string | null
  onSelecionar: (idBairro: string) => void
}

// Os 24 bairros com o valor do período ou "sem dados" (RF-02.34, CA-02.22): alternativa completa ao mapa, ordenável.
export function TabelaCasosBairros({
  exportacao,
  itens,
  selecionadoId,
  onSelecionar,
}: TabelaCasosBairrosProps) {
  const [ordem, setOrdem] = useState<SortingState>(ORDEM_INICIAL)
  // O compilador do React não memoiza o retorno do TanStack Table; o componente segue correto sem isso.
  // eslint-disable-next-line react-hooks/incompatible-library
  const tabela = useReactTable({
    data: itens,
    columns: COLUNAS,
    state: { sorting: ordem },
    onSortingChange: setOrdem,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <section aria-labelledby="titulo-tabela" className="flex flex-col gap-3">
      <h3 id="titulo-tabela" className="text-lg font-semibold">
        Casos por bairro
      </h3>
      {exportacao ? (
        <div className="flex justify-end">
          <BotaoExportarCsv
            colunas={colunasCsvCasosBairros(
              exportacao.periodo,
              exportacao.proveniencia
            )}
            obterLinhas={() =>
              tabela
                .getPrePaginationRowModel()
                .rows.map(({ original }) => original)
            }
            tipo="casos-por-bairro"
            bairro={exportacao.bairro}
            descricao="casos por bairro"
          />
        </div>
      ) : null}
      <Table>
        <TableCaption className="sr-only">
          Casos de cada bairro no período escolhido; bairros sem dados aparecem
          como sem dados
        </TableCaption>
        <TableHeader>
          {tabela.getHeaderGroups().map((grupo) => (
            <TableRow key={grupo.id}>
              {grupo.headers.map((cabecalho) => {
                const sentido = cabecalho.column.getIsSorted()
                const Icone = sentido ? ICONE_DA_ORDEM[sentido] : ArrowUpDown
                return (
                  <TableHead
                    key={cabecalho.id}
                    aria-sort={sentido ? SENTIDO_ARIA[sentido] : "none"}
                  >
                    <button
                      type="button"
                      onClick={cabecalho.column.getToggleSortingHandler()}
                      className="inline-flex items-center gap-1.5 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      {flexRender(
                        cabecalho.column.columnDef.header,
                        cabecalho.getContext()
                      )}
                      <Icone aria-hidden className="size-3.5" />
                    </button>
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {tabela.getRowModel().rows.map((linha) => {
            const selecionada = linha.original.bairro.id === selecionadoId
            return (
              <TableRow
                key={linha.id}
                data-state={selecionada ? "selected" : undefined}
              >
                {linha.getVisibleCells().map((celula) => (
                  <TableCell key={celula.id}>
                    {celula.column.id === "nome" ? (
                      <button
                        type="button"
                        aria-current={selecionada ? "true" : undefined}
                        onClick={() => onSelecionar(linha.original.bairro.id)}
                        className={cn(
                          "rounded-sm text-left underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          selecionada && "font-semibold text-primary"
                        )}
                      >
                        {linha.original.bairro.nome}
                      </button>
                    ) : (
                      flexRender(
                        celula.column.columnDef.cell,
                        celula.getContext()
                      )
                    )}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </section>
  )
}
