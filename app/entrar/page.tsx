import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { FormEntrar } from "@/components/auth/form-entrar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { destinoAposLogin } from "@/lib/auth/caminho-retorno"
import { obterSessaoAtual } from "@/lib/server/auth/dal"

export const metadata: Metadata = { title: "Entrar" }

// `motivo` vem da URL: só os valores deste mapa viram texto (nunca o valor bruto).
const AVISOS_POR_MOTIVO = new Map([
  ["restrito", "Entre para acessar esta área."],
  ["expirada", "Sua sessão expirou. Entre novamente."],
])

type ParametrosDaUrl = Record<string, string | string[] | undefined>

function primeiroValor(
  valor: string | string[] | undefined
): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor
}

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<ParametrosDaUrl>
}) {
  const parametros = await searchParams
  const retorno = destinoAposLogin(primeiroValor(parametros.retorno))
  if (await obterSessaoAtual()) redirect(retorno)

  const motivo = primeiroValor(parametros.motivo)
  const aviso = motivo ? AVISOS_POR_MOTIVO.get(motivo) : undefined

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Entrar</h1>
      {aviso ? (
        <Alert>
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      ) : null}
      <FormEntrar retorno={retorno} />
    </div>
  )
}
