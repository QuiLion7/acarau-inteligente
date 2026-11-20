"use client"

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import {
  DEPENDENCIAS_ESCOLA,
  LOCALIZACOES_ESCOLA,
  type Bairro,
  type Escola,
} from "@/lib/territorio/artefato-schema"
import {
  ESTADOS_COM_COBERTURA,
  ROTULO_ESTADO_ESCOLA,
} from "@/lib/territorio/estado-escola"
import {
  filtrarEscolas,
  SEM_FILTROS,
  TODAS,
} from "@/lib/territorio/filtro-escolas"
import { flexionar } from "@/lib/territorio/formato"

const ESCOLAS_POR_PAGINA = 10

const SEM_BAIRRO = "-"

type LinhaEscola = Escola & { bairroNome: string | null }

const COLUNAS: ColumnDef<LinhaEscola>[] = [
  { accessorKey: "nome", header: "Escola" },
  { accessorKey: "codigoInep", header: "Código INEP" },
  { accessorKey: "dependencia", header: "Dependência" },
  { accessorKey: "localizacao", header: "Localização" },
  {
    id: "bairro",
    header: "Bairro",
    cell: ({ row }) => row.original.bairroNome ?? SEM_BAIRRO,
  },
  {
    id: "cobertura",
    header: "Cobertura",
    cell: ({ row }) => ROTULO_ESTADO_ESCOLA[row.original.estado],
  },
]

type Opcao = { value: string; label: string }

const OPCAO_TODAS: Opcao = { value: TODAS, label: "Todas" }

const OPCOES_DEPENDENCIA: Opcao[] = [
  OPCAO_TODAS,
  ...DEPENDENCIAS_ESCOLA.map((valor) => ({ value: valor, label: valor })),
]
const OPCOES_LOCALIZACAO: Opcao[] = [
  OPCAO_TODAS,
  ...LOCALIZACOES_ESCOLA.map((valor) => ({ value: valor, label: valor })),
]
const OPCOES_COBERTURA: Opcao[] = [
  OPCAO_TODAS,
  ...ESTADOS_COM_COBERTURA.map((estado) => ({
    value: estado,
    label: ROTULO_ESTADO_ESCOLA[estado],
  })),
]

type TabelaEscolasProps = {
  escolas: Escola[]
  /** Nome de cada bairro, para a coluna de cobertura; só o necessário da lista de bairros. */
  bairros: Pick<Bairro, "id" | "nome">[]
  bairroSelecionado: Pick<Bairro, "id" | "nome" | "totalEscolas"> | null
  fonte: string
  dataReferencia: string
  onAbrirEscola: (codigoInep: string) => void
}

// Tabela de escolas (RF-01.20): filtra pelo bairro da URL e por dependência, localização e cobertura; pagina de 10.
// O total exibido é o tamanho da lista filtrada, sempre com fonte e data de referência.
export function TabelaEscolas({
  escolas,
  bairros,
  bairroSelecionado,
  fonte,
  dataReferencia,
  onAbrirEscola,
}: TabelaEscolasProps) {
  const [filtros, setFiltros] = useState(SEM_FILTROS)
  const bairroId = bairroSelecionado?.id ?? null
  const linhas = useMemo(() => {
    const nomePorId = new Map(bairros.map(({ id, nome }) => [id, nome]))
    return filtrarEscolas(escolas, { ...filtros, bairroId }).map((escola) => ({
      ...escola,
      bairroNome: escola.bairroId
        ? (nomePorId.get(escola.bairroId) ?? null)
        : null,
    }))
  }, [escolas, bairros, filtros, bairroId])
  // O compilador do React não memoiza o retorno do TanStack Table; o componente segue correto sem isso.
  // eslint-disable-next-line react-hooks/incompatible-library
  const tabela = useReactTable({
    data: linhas,
    columns: COLUNAS,
    initialState: { pagination: { pageSize: ESCOLAS_POR_PAGINA } },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
  const { pageIndex } = tabela.getState().pagination
  const primeira = pageIndex * ESCOLAS_POR_PAGINA + 1
  const ultima = Math.min(primeira + ESCOLAS_POR_PAGINA - 1, linhas.length)

  function alterarFiltro(
    campo: keyof typeof SEM_FILTROS,
    valor: string | null
  ) {
    setFiltros((atuais) => ({ ...atuais, [campo]: valor ?? TODAS }))
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">
        {bairroSelecionado
          ? `Escolas de ${bairroSelecionado.nome}`
          : "Todas as escolas da base"}
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <FiltroSelect
          id="filtro-dependencia"
          rotulo="Dependência"
          valor={filtros.dependencia}
          opcoes={OPCOES_DEPENDENCIA}
          onChange={(valor) => alterarFiltro("dependencia", valor)}
        />
        <FiltroSelect
          id="filtro-localizacao"
          rotulo="Localização"
          valor={filtros.localizacao}
          opcoes={OPCOES_LOCALIZACAO}
          onChange={(valor) => alterarFiltro("localizacao", valor)}
        />
        <FiltroSelect
          id="filtro-cobertura"
          rotulo="Cobertura"
          valor={filtros.cobertura}
          opcoes={OPCOES_COBERTURA}
          onChange={(valor) => alterarFiltro("cobertura", valor)}
        />
      </div>
      <Table>
        <TableCaption className="sr-only">
          Escolas da base disponível, com dependência, localização e cobertura
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
                  {celula.column.id === "nome" ? (
                    <button
                      type="button"
                      onClick={() => onAbrirEscola(linha.original.codigoInep)}
                      className="rounded-sm text-left underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
          ))}
        </TableBody>
      </Table>
      {linhas.length === 0 ? (
        <p role="status" className="text-sm text-muted-foreground">
          {bairroSelecionado?.totalEscolas === 0
            ? TEXTOS_TERRITORIO.bairroSemEscola
            : "Nenhuma escola da base corresponde aos filtros escolhidos."}
        </p>
      ) : (
        <p role="status" className="text-sm">
          Mostrando {primeira} a {ultima} de{" "}
          {flexionar(linhas.length, "escola", "escolas")}.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Fonte: {fonte}. Data de referência: {dataReferencia}.
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => tabela.previousPage()}
          disabled={!tabela.getCanPreviousPage()}
        >
          Página anterior
        </Button>
        <span className="text-sm">
          Página {pageIndex + 1} de {Math.max(tabela.getPageCount(), 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => tabela.nextPage()}
          disabled={!tabela.getCanNextPage()}
        >
          Próxima página
        </Button>
      </div>
    </div>
  )
}

type FiltroSelectProps = {
  id: string
  rotulo: string
  valor: string
  opcoes: Opcao[]
  onChange: (valor: string | null) => void
}

function FiltroSelect({
  id,
  rotulo,
  valor,
  opcoes,
  onChange,
}: FiltroSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-rotulo`} className="text-sm font-medium">
        {rotulo}
      </span>
      <Select value={valor} onValueChange={onChange} items={opcoes}>
        <SelectTrigger
          id={id}
          aria-labelledby={`${id}-rotulo`}
          className="w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
