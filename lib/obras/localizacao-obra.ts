// Bairro da obra a partir do ponto (TechSpec EP-04 §3, DV-41, DEC-T-01). Puro: roda igual no formulário (prévia) e
// no servidor (que recalcula e ignora o bairro enviado, RN-04.08). Cálculo direto em EPSG:4326 sobre os polígonos do
// artefato: desvio do DV-18 só para obras, que dispensa a reprojeção em runtime.
import type { Bairro } from "@/lib/territorio/artefato-schema"
import { atribuirPonto } from "@/lib/territorio/atribuicao-ponto"
import type { MultiPoligono } from "@/lib/territorio/geometria"
import { lerCoordenada } from "@/lib/obras/valores-obra"
import { pontoObraSchema, type PontoObra } from "@/lib/validations/obra-schema"

export type LocalizacaoCalculada =
  | { estado: "sem-localizacao" }
  | { estado: "fora-do-limite" }
  | { estado: "fora-da-cobertura" }
  | { estado: "dentro-de-bairro"; bairroId: string }

export type TerritorioDaObra = {
  limite: MultiPoligono
  bairros: readonly Pick<Bairro, "id" | "uv" | "geometria">[]
}

export function localizarObra(
  ponto: PontoObra | null,
  territorio: TerritorioDaObra
): LocalizacaoCalculada {
  const posicao: [number, number] | null = ponto
    ? [ponto.longitude, ponto.latitude]
    : null
  const atribuicao = atribuirPonto(
    posicao,
    territorio.limite,
    territorio.bairros.map(({ uv, geometria }) => ({
      uv,
      geometria: geometria.coordinates,
    }))
  )
  if (atribuicao.estado !== "dentro-de-bairro") {
    return { estado: atribuicao.estado }
  }
  const bairro = territorio.bairros.find(
    ({ uv }) => uv === atribuicao.uvAtribuida
  )
  // A UV atribuída sai desta mesma lista, então o bairro sempre existe.
  if (!bairro) throw new Error("Bairro atribuído ausente da lista de bairros.")
  return { estado: "dentro-de-bairro", bairroId: bairro.id }
}

/**
 * O ponto que as coordenadas digitadas formam (prévia do bairro e ponto provisório no mapa): só existe quando as duas
 * são números dentro dos limites geográficos. Qualquer outro caso é `null`, sem inventar ponto (RN-04.02); quem erra
 * é avisado pelo schema do formulário.
 */
export function lerPontoDigitado(
  latitude: string,
  longitude: string
): PontoObra | null {
  const [numeroLatitude, numeroLongitude] = [
    lerCoordenada(latitude),
    lerCoordenada(longitude),
  ]
  if (numeroLatitude === null || numeroLongitude === null) return null
  const ponto = pontoObraSchema.safeParse({
    latitude: numeroLatitude,
    longitude: numeroLongitude,
  })
  return ponto.success ? ponto.data : null
}
