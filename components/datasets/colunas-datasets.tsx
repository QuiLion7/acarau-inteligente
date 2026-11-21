import type { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { TEXTOS_SAUDE } from "@/lib/config/textos-saude"
import {
  formatarDataHora,
  rotuloDosPeriodos,
} from "@/lib/datasets/formato-versao"
import type {
  DatasetComVersoes,
  VersaoResumo,
} from "@/lib/validations/datasets-schema"

/** Uma versão com o dataset a que pertence: a lista tem uma linha por versão (CA-02.36). */
export type LinhaDeVersao = {
  datasetId: string
  nome: string
  indicador: string
  versao: VersaoResumo
}

export type AcoesDaLista = {
  onVerRelatorio: (versaoId: string) => void
  onPublicar: (versaoId: string) => void
  onDespublicar: (versaoId: string) => void
  /** Há uma publicação em andamento: os botões esperam. */
  ocupado: boolean
}

export function linhasDeVersoes(
  datasets: readonly DatasetComVersoes[]
): LinhaDeVersao[] {
  return datasets.flatMap(({ id, nome, indicador, versoes }) =>
    versoes.map((versao) => ({ datasetId: id, nome, indicador, versao }))
  )
}

function Acoes({
  linha,
  acoes,
}: {
  linha: LinhaDeVersao
  acoes: AcoesDaLista
}) {
  const { versao, nome } = linha
  const identificacao = `${nome}, versão ${versao.numero}`
  const publicado = versao.situacao === "publicado"
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={`Ver relatório de ${identificacao}`}
        onClick={() => acoes.onVerRelatorio(versao.id)}
      >
        Relatório
      </Button>
      <Button
        type="button"
        size="sm"
        variant={publicado ? "outline" : "default"}
        disabled={acoes.ocupado}
        aria-label={`${publicado ? "Despublicar" : "Publicar"} ${identificacao}`}
        onClick={() =>
          publicado
            ? acoes.onDespublicar(versao.id)
            : acoes.onPublicar(versao.id)
        }
      >
        {publicado ? "Despublicar" : "Publicar"}
      </Button>
      <Link
        href={`/saude?versao=${encodeURIComponent(versao.id)}`}
        aria-label={`Ver na Saúde: ${identificacao}`}
        className={buttonVariants({ size: "sm", variant: "ghost" })}
      >
        Ver na Saúde
      </Link>
    </div>
  )
}

export function criarColunas(acoes: AcoesDaLista): ColumnDef<LinhaDeVersao>[] {
  return [
    { id: "nome", header: "Dataset", accessorFn: (linha) => linha.nome },
    {
      id: "indicador",
      header: "Indicador",
      accessorFn: (linha) => linha.indicador,
    },
    {
      id: "versao",
      header: "Versão",
      accessorFn: (linha) => linha.versao.numero,
    },
    {
      id: "situacao",
      header: "Situação",
      cell: ({ row }) =>
        row.original.versao.situacao === "publicado" ? (
          <Badge>Publicado</Badge>
        ) : (
          <Badge variant="outline" title={TEXTOS_SAUDE.privado}>
            Privado
          </Badge>
        ),
    },
    { id: "autor", header: "Autor", accessorFn: (linha) => linha.versao.autor },
    {
      id: "importadoEm",
      header: "Importado em",
      accessorFn: (linha) => formatarDataHora(linha.versao.importadoEm),
    },
    {
      id: "periodos",
      header: "Períodos",
      accessorFn: (linha) => rotuloDosPeriodos(linha.versao.periodos),
    },
    {
      id: "linhas",
      header: "Linhas",
      accessorFn: (linha) =>
        linha.versao.linhasGravadas.toLocaleString("pt-BR"),
    },
    {
      id: "acoes",
      header: () => <span className="sr-only">Ações</span>,
      cell: ({ row }) => <Acoes linha={row.original} acoes={acoes} />,
    },
  ]
}
