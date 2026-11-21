import "server-only"

import type { NextRequest } from "next/server"

import { TAMANHO_MAXIMO_BYTES } from "@/lib/importacao/limites"
import { ErroApi } from "@/lib/server/http/erro-api"
import {
  confirmarImportacaoSchema,
  type ConfirmarImportacao,
} from "@/lib/validations/importacao-schema"

// O corpo leva o arquivo e um pouco de JSON e multipart: a margem cobre os dois sem abrir espaço para outro arquivo.
const MARGEM_DO_MULTIPART_BYTES = 64 * 1024
const SO_DIGITOS = /^\d+$/

export type RequisicaoDeImportacao = {
  arquivo: File
  dados: ConfirmarImportacao
}

function erroDeValidacao(campo: string, mensagem: string): ErroApi {
  return new ErroApi("VALIDACAO", {
    details: { campos: { [campo]: mensagem } },
  })
}

// O `proxy.ts` guarda o corpo em memória até 10 MB e entrega o resto truncado, sem erro (DV-30, R-02): por isso o
// tamanho declarado é conferido ANTES de ler o corpo, e o arquivo é conferido de novo depois.
function conferirTamanhoDeclarado(request: NextRequest): void {
  const declarado = request.headers.get("content-length")
  if (declarado === null || !SO_DIGITOS.test(declarado)) {
    throw erroDeValidacao(
      "content-length",
      "Informe o tamanho do conteúdo enviado."
    )
  }
  if (Number(declarado) > TAMANHO_MAXIMO_BYTES + MARGEM_DO_MULTIPART_BYTES) {
    throw new ErroApi("ARQUIVO_GRANDE_DEMAIS")
  }
}

async function lerFormulario(request: NextRequest): Promise<FormData> {
  try {
    return await request.formData()
  } catch {
    // Corpo que não é multipart (ou truncado) cai na validação, que responde 400 no envelope.
    throw erroDeValidacao(
      "corpo",
      "Envie o arquivo e os dados como multipart/form-data."
    )
  }
}

function lerArquivo(formulario: FormData): File {
  const arquivo = formulario.get("arquivo")
  if (!(arquivo instanceof File)) {
    throw erroDeValidacao("arquivo", "Envie o arquivo CSV.")
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES)
    throw new ErroApi("ARQUIVO_GRANDE_DEMAIS")
  return arquivo
}

function lerJson(texto: FormDataEntryValue | null): unknown {
  if (typeof texto !== "string") return undefined
  try {
    return JSON.parse(texto)
  } catch {
    // JSON inválido é o mesmo que dados ausentes: a validação do schema responde.
    return undefined
  }
}

function lerDados(formulario: FormData): ConfirmarImportacao {
  const dados = confirmarImportacaoSchema.safeParse(
    lerJson(formulario.get("dados"))
  )
  if (dados.success) return dados.data
  // Só o caminho e a mensagem do schema: nunca eco do valor enviado (seguranca.md §6).
  const campos: Record<string, string> = {}
  for (const problema of dados.error.issues) {
    campos[problema.path.join(".") || "dados"] ??= problema.message
  }
  throw new ErroApi("VALIDACAO", { details: { campos } })
}

/** Confere o tamanho declarado, lê o multipart e valida `arquivo` e `dados` (TechSpec §5, `POST /api/importacoes`). */
export async function lerRequisicaoDeImportacao(
  request: NextRequest
): Promise<RequisicaoDeImportacao> {
  conferirTamanhoDeclarado(request)
  const formulario = await lerFormulario(request)
  return { arquivo: lerArquivo(formulario), dados: lerDados(formulario) }
}
