import pacote from "@/package.json"

const TAMANHO_CURTO_DO_COMMIT = 7

type FonteVersao = Readonly<Record<string, string | undefined>>

/**
 * Versão da aplicação exibida no relatório (RF-05.07): `version` do `package.json` e o commit curto da publicação
 * (`VERCEL_GIT_COMMIT_SHA`), ou `local` fora da Vercel. Ex.: "0.5.0+a1b2c3d".
 */
export function versaoDaApp(
  ambiente: FonteVersao = process.env,
  versaoDoPacote: string = pacote.version
): string {
  const commit = ambiente.VERCEL_GIT_COMMIT_SHA?.trim().slice(
    0,
    TAMANHO_CURTO_DO_COMMIT
  )
  return `${versaoDoPacote}+${commit || "local"}`
}
