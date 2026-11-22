// Como a obra aparece escrita na lista e na ficha (RF-04.04, RF-04.10). Puro: quem chama passa os nomes dos bairros.
import { TEXTOS_OBRAS } from "@/lib/config/textos-obras"
import type { Obra } from "@/lib/validations/obra-schema"

type BairroComNome = { id: string; nome: string }

/** Nome do bairro, "Fora da cobertura dos bairros" ou "Sem localização": nunca o id técnico `uv-NN`. */
export function rotuloDoBairroDaObra(
  { estadoLocalizacao, bairroId }: Pick<Obra, "estadoLocalizacao" | "bairroId">,
  bairros: readonly BairroComNome[]
): string {
  if (estadoLocalizacao === "sem-localizacao") {
    return TEXTOS_OBRAS.localizacao.semLocalizacao
  }
  if (estadoLocalizacao === "fora-da-cobertura") {
    return TEXTOS_OBRAS.localizacao.foraDaCobertura
  }
  return (
    bairros.find(({ id }) => id === bairroId)?.nome ??
    TEXTOS_OBRAS.localizacao.foraDaCobertura
  )
}
