import type { Metadata } from "next"
import Link from "next/link"

import { FiltrosRelatorio } from "@/app/relatorios/components/filtros-relatorio"
import { EstadoInterface } from "@/components/estados/estado-interface"
import { BotaoGerarPdf } from "@/components/relatorios/botao-gerar-pdf"
import { PreviaRelatorio } from "@/components/relatorios/previa-relatorio"
import { buttonVariants } from "@/components/ui/button"
import { moduloPorId } from "@/lib/config/modulos"
import { TEXTOS_RELATORIOS } from "@/lib/config/textos-relatorios"
import { lerFiltros } from "@/lib/filtros/filtros-url"
import { lerVersaoDaUrl } from "@/lib/filtros/versao-da-url"
import { obterSessaoAtual } from "@/lib/server/auth/dal"
import { obterBanco } from "@/lib/server/db/cliente"
import { log } from "@/lib/server/log"
import {
  montarRelatorio,
  type ResultadoRelatorio,
} from "@/lib/server/relatorios/relatorio-servico"
import { listarResumoBairros } from "@/lib/server/territorio/territorio-repositorio"

const modulo = moduloPorId("relatorios")

export const metadata: Metadata = { title: modulo.rotulo }

type ParametrosDaUrl = Record<string, string | string[] | undefined>

function primeiroValor(parametros: ParametrosDaUrl, nome: string) {
  const valor = parametros[nome]
  return Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null)
}

// Falha do banco vira o estado de erro da página, registrada uma vez, aqui, onde é tratada.
async function lerRelatorio(
  entrada: Parameters<typeof montarRelatorio>[1]
): Promise<ResultadoRelatorio | null> {
  try {
    return await montarRelatorio(obterBanco(), entrada)
  } catch (erro) {
    log.error("relatorio.montagem_falhou", { erro })
    return null
  }
}

// Server Component (DV-17, DV-25, DV-49): lê a sessão e os filtros da URL e monta o `RelatorioDados` no servidor. A
// página é pública (RN-05.05): o visitante vê o relatório com o que o papel dele vê, e a versão privada pedida por ele é
// "não encontrada", sem nenhum dado dela.
export default async function PaginaRelatorios({
  searchParams,
}: {
  searchParams: Promise<ParametrosDaUrl>
}) {
  const [parametros, sessao] = await Promise.all([
    searchParams,
    obterSessaoAtual(),
  ])
  const resultado = await lerRelatorio({
    filtros: lerFiltros({ get: (nome) => primeiroValor(parametros, nome) }),
    versaoId: lerVersaoDaUrl(parametros),
    sessao,
  })
  const periodos =
    resultado?.status === "ok" &&
    resultado.dados.saude.estado !== "nenhum-dataset"
      ? resultado.dados.saude.periodos
      : null

  return (
    <div className="flex flex-col gap-6">
      <header className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {modulo.rotulo}
        </h1>
        <p className="text-muted-foreground">
          {TEXTOS_RELATORIOS.descricaoDaPagina}
        </p>
      </header>
      {resultado?.status === "ok" ? (
        <>
          <FiltrosRelatorio
            bairros={listarResumoBairros()}
            periodos={periodos}
          />
          <BotaoGerarPdf dados={resultado.dados} />
          <PreviaRelatorio dados={resultado.dados} />
        </>
      ) : null}
      {resultado?.status === "versao-nao-encontrada" ? (
        <EstadoInterface
          tipo="vazio"
          titulo={TEXTOS_RELATORIOS.erro.versaoNaoEncontrada}
          descricao={TEXTOS_RELATORIOS.erro.versaoNaoEncontradaDescricao}
          acao={
            <Link href="/relatorios" className={buttonVariants()}>
              Ver o relatório da versão publicada
            </Link>
          }
        />
      ) : null}
      {resultado === null ? <EstadoInterface tipo="erro" /> : null}
    </div>
  )
}
