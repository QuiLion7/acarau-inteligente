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

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TEXTOS_TERRITORIO } from "@/lib/config/textos-territorio"
import type { Bairro } from "@/lib/territorio/artefato-schema"
import { formatarAreaM2 } from "@/lib/territorio/formato"
import { cn } from "@/lib/utils"

type LinhaBairro = Pick<
  Bairro,
  "id" | "uv" | "nome" | "areaCalculadaM2" | "totalEscolas"
>

const ID_NOTA_SEM_ESCOLA = "nota-bairro-sem-escola"

const COLUNAS: ColumnDef<LinhaBairro>[] = [
  { accessorKey: "uv", header: "UV" },
  { accessorKey: "nome", header: "Bairro" },
  {
    accessorKey: "areaCalculadaM2",
    header: "Área calculada",
    cell: ({ getValue }) => formatarAreaM2(getValue<number>()),
  },
  { accessorKey: "totalEscolas", header: "Escolas" },
]

const ORDEM_INICIAL: SortingState = [{ id: "uv", desc: false }]

const ICONE_DA_ORDEM = { asc: ArrowUp, desc: ArrowDown } as const
const SENTIDO_ARIA = { asc: "ascending", desc: "descending" } as const

type TabelaBairrosProps = {
  bairros: LinhaBairro[]
  selecionadoId: string | null
  onSelecionar: (idBairro: string) => void
}

// Tabela de bairros (RF-01.19): ordenável, e cada linha seleciona pelo botão do nome (teclado e leitor de tela).
export function TabelaBairros({
  bairros,
  selecionadoId,
  onSelecionar,
}: TabelaBairrosProps) {
  const [ordem, setOrdem] = useState<SortingState>(ORDEM_INICIAL)
  // O compilador do React não memoiza o retorno do TanStack Table; o componente segue correto sem isso.
  // eslint-disable-next-line react-hooks/incompatible-library
  const tabela = useReactTable({
    data: bairros,
    columns: COLUNAS,
    state: { sorting: ordem },
    onSortingChange: setOrdem,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })
  const algumSemEscola = bairros.some((bairro) => bairro.totalEscolas === 0)

  return (
    <div className="flex flex-col gap-2">
      <Table>
        <TableCaption className="sr-only">
          Bairros da sede, com área calculada e número de escolas da base
          disponível
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
            const selecionada = linha.original.id === selecionadoId
            return (
              <TableRow
                key={linha.id}
                data-state={selecionada ? "selected" : undefined}
              >
                {linha.getVisibleCells().map((celula) => (
                  <TableCell
                    key={celula.id}
                    aria-describedby={
                      celula.column.id === "totalEscolas" &&
                      linha.original.totalEscolas === 0
                        ? ID_NOTA_SEM_ESCOLA
                        : undefined
                    }
                  >
                    {celula.column.id === "nome" ? (
                      <button
                        type="button"
                        aria-current={selecionada ? "true" : undefined}
                        onClick={() => onSelecionar(linha.original.id)}
                        className={cn(
                          "rounded-sm text-left underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          selecionada && "font-semibold text-primary"
                        )}
                      >
                        {linha.original.nome}
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
      {algumSemEscola ? (
        <p id={ID_NOTA_SEM_ESCOLA} className="text-sm text-muted-foreground">
          <strong className="font-medium">Escolas igual a 0:</strong>{" "}
          {TEXTOS_TERRITORIO.bairroSemEscola}
        </p>
      ) : null}
    </div>
  )
}
