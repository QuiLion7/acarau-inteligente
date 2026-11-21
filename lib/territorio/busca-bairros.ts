// Busca de bairro por nome, nome da lei ou código da UV (RN-009). Serve à lista do Território e, no EP-02, ao
// reconhecimento de bairro no CSV.
import type { BairroResumo } from "./artefato-schema"
import { normalizarParaBusca } from "./nome-bairro"

// Exportado para o EP-02 distinguir código de UV de trecho de nome ao reconhecer bairro no CSV.
export const CODIGO_UV = /^(?:uv[\s-]*)?(\d{1,2})$/

/** Termo vazio devolve todos; "3", "uv 3" e "uv-03" acham a UV 3; o resto é trecho do nome, sem acento nem caixa. */
export function buscarBairros(
  bairros: readonly BairroResumo[],
  termo: string
): BairroResumo[] {
  const termoNormalizado = normalizarParaBusca(termo)
  if (termoNormalizado === "") return [...bairros]
  const codigo = CODIGO_UV.exec(termoNormalizado)?.[1]
  if (codigo !== undefined) {
    return bairros.filter((bairro) => bairro.uv === Number(codigo))
  }
  return bairros.filter((bairro) =>
    [bairro.nome, bairro.nomeLei].some((nome) =>
      normalizarParaBusca(nome).includes(termoNormalizado)
    )
  )
}
