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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TEXTOS_EDUCACAO } from "@/lib/config/textos-educacao"
import type { Bairro, QualidadeEscolas } from "@/lib/territorio/artefato-schema"
import { foraDaCoberturaDosBairros } from "@/lib/territorio/contagem-cobertura"
import {
  COLUNAS_CSV_ESCOLAS_POR_BAIRRO,
  linhasCsvEscolasPorBairro,
} from "@/lib/territorio/csv-escolas-por-bairro"
import { ROTULO_ESTADO_ESCOLA } from "@/lib/territorio/estado-escola"
import { cn } from "@/lib/utils"

const { tabela: TEXTOS } = TEXTOS_EDUCACAO

type LinhaBairro = Pick<Bairro, "id" | "uv" | "nome" | "totalEscolas">

const COLUNAS: ColumnDef<LinhaBairro>[] = [
  { accessorKey: "uv", header: "UV" },
  { accessorKey: "nome", header: "Bairro" },
  {
    accessorKey: "totalEscolas",
    header: TEXTOS.escolas,
    // Zero é zero real da base inteira (RN-03.07): o texto diz "na base disponível" para não virar "sem escola".
    cell: ({ getValue }) => {
      const total = getValue<number>()
      return total === 0 ? TEXTOS.semEscola : total
    },
  },
]

const ORDEM_INICIAL: SortingState = [{ id: "uv", desc: false }]
const ICONE_DA_ORDEM = { asc: ArrowUp, desc: ArrowDown } as const
const SENTIDO_ARIA = { asc: "ascending", desc: "descending" } as const

type TabelaEscolasPorBairroProps = {
  bairros: LinhaBairro[]
  qualidade: QualidadeEscolas
  selecionadoId: string | null
  onSelecionar: (idBairro: string) => void
}

type LinhaForaDaSoma = { rotulo: string; total: number }

// O artefato guarda em `foraDaCobertura` também a escola fora do limite; aqui ela vira linha própria (RN-03.06).
function linhasForaDaSoma(qualidade: QualidadeEscolas): LinhaForaDaSoma[] {
  return [
    {
      rotulo: ROTULO_ESTADO_ESCOLA["fora-da-cobertura"],
      total: foraDaCoberturaDosBairros(qualidade),
    },
    {
      rotulo: ROTULO_ESTADO_ESCOLA["fora-do-limite"],
      total: qualidade.foraDoLimite,
    },
    {
      rotulo: ROTULO_ESTADO_ESCOLA["sem-localizacao"],
      total: qualidade.semLocalizacao,
    },
  ]
}

// Tabela dos 24 bairros com o número de escolas dentro de cada um (RF-03.16): ordenável, a seleção pelo botão do nome,
// e as linhas fora da cobertura, fora do limite e sem localização à parte, sem somar a nenhum bairro (CA-03.18).
export function TabelaEscolasPorBairro({
  bairros,
  qualidade,
  selecionadoId,
  onSelecionar,
}: TabelaEscolasPorBairroProps) {
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

  return (
    <section
      aria-labelledby="titulo-escolas-por-bairro"
      className="flex flex-col gap-3"
    >
      <h3 id="titulo-escolas-por-bairro" className="text-lg font-semibold">
        {TEXTOS.titulo}
      </h3>
      <div className="flex justify-end">
        <BotaoExportarCsv
          colunas={COLUNAS_CSV_ESCOLAS_POR_BAIRRO}
          obterLinhas={() =>
            linhasCsvEscolasPorBairro(
              tabela
                .getPrePaginationRowModel()
                .rows.map(({ original }) => original),
              qualidade
            )
          }
          tipo="escolas-por-bairro"
          descricao="escolas por bairro"
        />
      </div>
      <Table>
        <TableCaption className="sr-only">{TEXTOS.legenda}</TableCaption>
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
                  <TableCell key={celula.id}>
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
        <TableFooter>
          <TableRow>
            <TableHead colSpan={COLUNAS.length}>{TEXTOS.foraDaSoma}</TableHead>
          </TableRow>
          {linhasForaDaSoma(qualidade).map(({ rotulo, total }) => (
            <TableRow key={rotulo}>
              <TableCell>-</TableCell>
              <TableCell>{rotulo}</TableCell>
              <TableCell>{total}</TableCell>
            </TableRow>
          ))}
        </TableFooter>
      </Table>
      <p className="text-sm text-muted-foreground">{TEXTOS.notaForaDaSoma}</p>
    </section>
  )
}
