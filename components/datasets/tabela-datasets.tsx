"use client"

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import Link from "next/link"
import { useMemo, useState } from "react"

import {
  criarColunas,
  linhasDeVersoes,
  type LinhaDeVersao,
} from "@/components/datasets/colunas-datasets"
import { RelatorioImportacao } from "@/components/datasets/relatorio-importacao"
import { EstadoInterface } from "@/components/estados/estado-interface"
import { buttonVariants } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useDatasets,
  useDespublicar,
  usePublicar,
} from "@/hooks/query/use-datasets"

const SEM_LINHAS: LinhaDeVersao[] = []

// Lista de datasets (RF-02.25, CA-02.36): uma linha por versão, com o relatório e a publicação ao lado.
export function TabelaDatasets() {
  const datasets = useDatasets()
  const publicar = usePublicar()
  const despublicar = useDespublicar()
  const [versaoDoRelatorio, setVersaoDoRelatorio] = useState<string | null>(
    null
  )

  const ocupado = publicar.isPending || despublicar.isPending
  const { mutate: publicarVersao } = publicar
  const { mutate: despublicarVersao } = despublicar
  const colunas = useMemo(
    () =>
      criarColunas({
        onVerRelatorio: setVersaoDoRelatorio,
        onPublicar: publicarVersao,
        onDespublicar: despublicarVersao,
        ocupado,
      }),
    [publicarVersao, despublicarVersao, ocupado]
  )
  const linhas = useMemo(
    () => (datasets.data ? linhasDeVersoes(datasets.data) : SEM_LINHAS),
    [datasets.data]
  )
  // O compilador do React não memoiza o retorno do TanStack Table; o componente segue correto sem isso.
  // eslint-disable-next-line react-hooks/incompatible-library
  const tabela = useReactTable({
    data: linhas,
    columns: colunas,
    getCoreRowModel: getCoreRowModel(),
  })

  if (datasets.isLoading) return <EstadoInterface tipo="carregando" />
  if (datasets.isError) {
    return <EstadoInterface tipo="erro" descricao={datasets.error.message} />
  }
  if (linhas.length === 0) {
    return (
      <EstadoInterface
        tipo="vazio"
        titulo="Nenhum dataset importado"
        descricao="Importe um arquivo CSV para criar o primeiro dataset."
        acao={
          <Link href="/saude/importar" className={buttonVariants()}>
            Importar CSV
          </Link>
        }
      />
    )
  }

  return (
    <>
      <Table>
        <TableCaption className="sr-only">
          Datasets importados, com uma linha por versão
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
            <TableRow key={linha.id}>
              {linha.getVisibleCells().map((celula) => (
                <TableCell key={celula.id}>
                  {flexRender(
                    celula.column.columnDef.cell,
                    celula.getContext()
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <RelatorioImportacao
        versaoId={versaoDoRelatorio}
        onFechar={() => setVersaoDoRelatorio(null)}
      />
    </>
  )
}
