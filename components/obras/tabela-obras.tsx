"use client"

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useEffect, useMemo, useRef } from "react"

import { SimboloObra } from "@/components/obras/simbolo-obra"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TEXTOS_OBRAS } from "@/lib/config/textos-obras"
import { rotuloDoBairroDaObra } from "@/lib/obras/apresentacao-obra"
import {
  ROTULO_CATEGORIA_OBRA,
  ROTULO_SITUACAO_OBRA,
} from "@/lib/obras/situacao-obra"
import { formatarData, formatarInstante } from "@/lib/obras/valores-obra"
import type { Obra } from "@/lib/validations/obra-schema"

const SEM_VALOR = "-"
const { colunas: ROTULOS } = TEXTOS_OBRAS.lista

/** Id do botão da obra na lista: o `finalFocus` da ficha o procura para devolver o foco ao fechar (RNF-04.01). */
export function idDoBotaoDaObra(obraId: string): string {
  return `botao-obra-${obraId}`
}

type LinhaObra = Obra & { bairroRotulo: string }

type TabelaObrasProps = {
  obras: readonly Obra[]
  /** Só o necessário dos bairros: o nome que a coluna escreve no lugar do id técnico. */
  bairros: readonly { id: string; nome: string }[]
  obraSelecionadaId: string | null
  onAbrirObra: (obraId: string) => void
}

// Colunas fora do componente: referência estável (react-next §7). A coluna da obra é desenhada pela tabela, que é
// quem sabe abrir a ficha.
const COLUNAS: ColumnDef<LinhaObra>[] = [
  { id: "obra", header: ROTULOS.obra },
  {
    id: "situacao",
    header: ROTULOS.situacao,
    cell: ({ row: { original: obra } }) => (
      <span className="flex items-center gap-2">
        <SimboloObra situacao={obra.situacao} />
        {ROTULO_SITUACAO_OBRA[obra.situacao]}
      </span>
    ),
  },
  {
    id: "categoria",
    header: ROTULOS.categoria,
    cell: ({ row: { original: obra } }) =>
      obra.categoria ? ROTULO_CATEGORIA_OBRA[obra.categoria] : SEM_VALOR,
  },
  { accessorKey: "bairroRotulo", header: ROTULOS.bairro },
  {
    id: "dataPrevista",
    header: ROTULOS.dataPrevista,
    cell: ({ row: { original: obra } }) =>
      obra.dataPrevista ? formatarData(obra.dataPrevista) : SEM_VALOR,
  },
  {
    id: "atualizadoEm",
    header: ROTULOS.atualizadoEm,
    cell: ({ row: { original: obra } }) => formatarInstante(obra.atualizadoEm),
  },
  {
    id: "origem",
    header: ROTULOS.origem,
    cell: ({ row: { original: obra } }) => (
      <Badge variant="secondary">{obra.proveniencia}</Badge>
    ),
  },
]

// Lista de obras (RF-04.04, DEC-T-10): sem paginação, em área rolável, porque o teto é de 200 e o marcador selecionado
// precisa ter a linha à vista. A linha da obra selecionada leva `aria-current` e é rolada para dentro da área. Tabela
// é a alternativa em texto ao mapa (RN-023).
export function TabelaObras({
  obras,
  bairros,
  obraSelecionadaId,
  onAbrirObra,
}: TabelaObrasProps) {
  const areaRef = useRef<HTMLDivElement>(null)
  const linhas = useMemo(
    () =>
      obras.map((obra) => ({
        ...obra,
        bairroRotulo: rotuloDoBairroDaObra(obra, bairros),
      })),
    [obras, bairros]
  )
  // O compilador do React não memoiza o retorno do TanStack Table; o componente segue correto sem isso.
  // eslint-disable-next-line react-hooks/incompatible-library
  const tabela = useReactTable({
    data: linhas,
    columns: COLUNAS,
    // A linha é da obra, não da posição: depois de salvar a obra editada sobe na lista e o foco e o `aria-current`
    // acompanham a mesma linha.
    getRowId: (linha) => linha.id,
    getCoreRowModel: getCoreRowModel(),
  })

  // Sincroniza a rolagem do DOM com a seleção (que pode vir do marcador no mapa): a linha selecionada fica à vista.
  useEffect(() => {
    areaRef.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: "nearest" })
  }, [obraSelecionadaId])

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={areaRef}
        // Área rolável focável: sem isso quem usa só o teclado não rola a lista (WCAG 2.1.1).
        tabIndex={0}
        role="region"
        aria-label={TEXTOS_OBRAS.secoes.lista}
        className="max-h-[32rem] overflow-auto rounded-lg border"
      >
        <Table>
          <TableCaption className="sr-only">
            {TEXTOS_OBRAS.lista.legenda}
          </TableCaption>
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
              <TableRow
                key={linha.id}
                aria-current={
                  linha.original.id === obraSelecionadaId ? "true" : undefined
                }
                className="aria-[current=true]:bg-muted"
              >
                {linha.getVisibleCells().map((celula) => (
                  <TableCell key={celula.id}>
                    {celula.column.id === "obra" ? (
                      <button
                        type="button"
                        id={idDoBotaoDaObra(linha.original.id)}
                        onClick={() => onAbrirObra(linha.original.id)}
                        className="rounded-sm text-left underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        {/* Título é texto digitado: entra como texto do React, nunca como HTML (RNF-04.04). */}
                        {linha.original.titulo}
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
            ))}
          </TableBody>
        </Table>
      </div>
      <p role="status" className="text-sm">
        {TEXTOS_OBRAS.lista.mostrando(obras.length)}
      </p>
    </div>
  )
}
