"use client"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { blobDoCsv, gerarCsv, type ColunaCsv } from "@/lib/exportacao/csv"
import { baixarBlob } from "@/lib/exportacao/baixar-arquivo"
import { nomeArquivo } from "@/lib/relatorios/nome-arquivo"

const ROTULO = "Exportar CSV"
const MENSAGEM_DE_ERRO = "Não foi possível exportar o CSV. Tente de novo."

type BotaoExportarCsvProps<T> = {
  colunas: readonly ColunaCsv<T>[]
  /**
   * As linhas no momento do clique: `table.getPrePaginationRowModel().rows` com o filtro e a ordem da tela, todas as
   * páginas (RF-05.18, DEC-T-12). Lidas no clique, não a cada render: a tabela é estado do TanStack Table.
   */
  obterLinhas: () => readonly T[]
  /** O que o arquivo é, para o nome: "obras", "escolas"... */
  tipo: string
  /** Nome do bairro do filtro, se houver; entra no nome do arquivo. */
  bairro?: string | null
  /** Qual tabela é, para o leitor de tela distinguir botões de mesmo rótulo na mesma página. */
  descricao: string
}

// Baixa a tabela como CSV (RF-05.18): gera no navegador e entrega por `baixarBlob`, sem endpoint. Exportar não grava nada
// e não exige login (RN-05.05). O rótulo visível é "Exportar CSV"; o nome acessível o começa com o mesmo texto.
export function BotaoExportarCsv<T>({
  colunas,
  obterLinhas,
  tipo,
  bairro,
  descricao,
}: BotaoExportarCsvProps<T>) {
  function handleExportar() {
    try {
      const csv = gerarCsv(colunas, obterLinhas())
      baixarBlob(
        blobDoCsv(csv),
        nomeArquivo({ tipo, data: new Date(), bairro, extensao: "csv" })
      )
    } catch (erro) {
      if (process.env.NODE_ENV !== "production") console.error(erro)
      toast.error(MENSAGEM_DE_ERRO)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={`${ROTULO}: ${descricao}`}
      onClick={handleExportar}
    >
      {ROTULO}
    </Button>
  )
}
