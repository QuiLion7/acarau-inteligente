import { idVersaoSchema } from "@/lib/validations/datasets-schema"

type ParametrosDaUrl = Readonly<
  Record<string, string | readonly string[] | undefined>
>

/**
 * `versao` da URL como uuid, ou `null`: valor fora do formato conta como ausente e nada do texto bruto é usado nem
 * exibido (RF-02.28). Serve à Saúde e ao Relatório, que escolhem a versão do dataset pela mesma URL.
 */
export function lerVersaoDaUrl(parametros: ParametrosDaUrl): string | null {
  const bruto = parametros.versao
  const valido = idVersaoSchema.safeParse(
    Array.isArray(bruto) ? bruto[0] : bruto
  )
  return valido.success ? valido.data : null
}
