import { readFileSync } from "node:fs"
import { join } from "node:path"

import { NextRequest } from "next/server"

import { buscarConta } from "@/lib/auth/contas-demo"
import { NOME_COOKIE_SESSAO } from "@/lib/auth/nome-cookie-sessao"
import type { Ambiente } from "@/lib/config/ambiente"
import { criarSessao } from "@/lib/server/auth/sessao-servico"
import type { ConfirmarImportacao } from "@/lib/validations/importacao-schema"

// Apoio dos testes de integração da importação: multipart de verdade, com o `Content-Length` que o navegador manda.

export const ORIGEM_DO_APP = "http://localhost:3000"

export const DECISOES_DO_ROTEIRO: ConfirmarImportacao["decisoes"] = [
  { nomeNormalizado: "morada", tipo: "bairro", bairroId: "uv-20" },
  { nomeNormalizado: "aranau", tipo: "fora-da-cobertura" },
]

export const DADOS_DO_ROTEIRO: ConfirmarImportacao = {
  separador: ";",
  mapeamento: { bairro: 0, periodo: 1, casos: 2 },
  decisoes: DECISOES_DO_ROTEIRO,
  metadados: {
    nome: "Roteiro 2025-2026",
    indicador: "Casos notificados (sintético)",
    fonte: "Planilha de roteiro",
  },
  destino: { tipo: "novo" },
}

export function bytesSinteticos(caminho: string): Uint8Array {
  return new Uint8Array(
    readFileSync(join(process.cwd(), "dados", "sinteticos", caminho))
  )
}

export async function tokenDoUsuario(
  usuario: string,
  ambiente: Ambiente
): Promise<string> {
  const conta = buscarConta(usuario, ambiente)
  if (!conta) throw new Error("conta de teste ausente")
  return (await criarSessao(conta, new Date())).token
}

type OpcoesDaRequisicao = {
  token?: string
  origem?: string | null
  arquivo?: { nome: string; bytes: Uint8Array } | null
  /** Objeto vira JSON; texto vai como veio (para testar JSON inválido). */
  dados?: unknown
  contentLength?: number | null
  /** Corpo que não é multipart. */
  corpoBruto?: string
}

function cabecalhosDe(
  opcoes: OpcoesDaRequisicao,
  tipoDoCorpo: string,
  tamanho: number
): Record<string, string> {
  const cabecalhos: Record<string, string> = { "content-type": tipoDoCorpo }
  const comprimento =
    opcoes.contentLength === undefined ? tamanho : opcoes.contentLength
  if (comprimento !== null) cabecalhos["content-length"] = String(comprimento)
  if (opcoes.token) cabecalhos.cookie = `${NOME_COOKIE_SESSAO}=${opcoes.token}`
  if (opcoes.origem !== null) cabecalhos.origin = opcoes.origem ?? ORIGEM_DO_APP
  return cabecalhos
}

function montarFormulario(opcoes: OpcoesDaRequisicao): FormData {
  const formulario = new FormData()
  if (opcoes.arquivo) {
    formulario.append(
      "arquivo",
      new File([new Uint8Array(opcoes.arquivo.bytes)], opcoes.arquivo.nome, {
        type: "text/csv",
      })
    )
  }
  const dados = opcoes.dados === undefined ? DADOS_DO_ROTEIRO : opcoes.dados
  formulario.append(
    "dados",
    typeof dados === "string" ? dados : JSON.stringify(dados)
  )
  return formulario
}

/** `POST /api/importacoes` como o navegador o envia: multipart serializado, com `Content-Length` e `Origin`. */
export async function requisicaoDeImportacao(
  opcoes: OpcoesDaRequisicao = {}
): Promise<NextRequest> {
  const comArquivo = { arquivo: bytesDoRoteiroComoArquivo(), ...opcoes }
  if (opcoes.corpoBruto !== undefined) {
    const corpo = opcoes.corpoBruto
    return new NextRequest(`${ORIGEM_DO_APP}/api/importacoes`, {
      method: "POST",
      body: corpo,
      headers: cabecalhosDe(opcoes, "text/plain", corpo.length),
    })
  }
  const resposta = new Response(montarFormulario(comArquivo))
  const corpo = await resposta.arrayBuffer()
  return new NextRequest(`${ORIGEM_DO_APP}/api/importacoes`, {
    method: "POST",
    body: corpo,
    headers: cabecalhosDe(
      opcoes,
      resposta.headers.get("content-type") ?? "",
      corpo.byteLength
    ),
  })
}

function bytesDoRoteiroComoArquivo() {
  return {
    nome: "saude-roteiro_DEMO.csv",
    bytes: bytesSinteticos("saude-roteiro_DEMO.csv"),
  }
}

/** O roteiro com um valor trocado: outro conteúdo, mesmas colunas e decisões (serve de "arquivo alterado"). */
export function roteiroAlterado(
  nome: string,
  casosDoCentro: number
): { nome: string; bytes: Uint8Array } {
  const texto = new TextDecoder().decode(
    bytesSinteticos("saude-roteiro_DEMO.csv")
  )
  return {
    nome,
    bytes: new TextEncoder().encode(
      texto.replace("Centro;2025;42", `Centro;2025;${casosDoCentro}`)
    ),
  }
}

type OpcoesDeRota = { metodo?: string; token?: string; origem?: string | null }

/** Requisição sem corpo a uma rota do app: com cookie de sessão e `Origin` do app, salvo o que o teste trocar. */
export function requisicaoDeRota(
  caminho: string,
  { metodo = "GET", token, origem }: OpcoesDeRota = {}
): NextRequest {
  const cabecalhos: Record<string, string> = {}
  if (token) cabecalhos.cookie = `${NOME_COOKIE_SESSAO}=${token}`
  if (origem !== null) cabecalhos.origin = origem ?? ORIGEM_DO_APP
  return new NextRequest(`${ORIGEM_DO_APP}${caminho}`, {
    method: metodo,
    headers: cabecalhos,
  })
}
