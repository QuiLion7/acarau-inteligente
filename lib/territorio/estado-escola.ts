import type { EstadoEscola } from "./artefato-schema"

/** Como cada estado de cobertura (DV-19) aparece escrito na tabela, na ficha, no filtro e na legenda. */
export const ROTULO_ESTADO_ESCOLA: Record<EstadoEscola, string> = {
  "dentro-de-bairro": "Dentro de bairro",
  "fora-da-cobertura": "Fora da cobertura dos bairros",
  "fora-do-limite": "Fora do limite municipal",
  "sem-localizacao": "Sem localização",
}

/** Estados que o filtro de cobertura oferece, na ordem em que aparecem. */
export const ESTADOS_COM_COBERTURA: readonly EstadoEscola[] = [
  "dentro-de-bairro",
  "fora-da-cobertura",
  "fora-do-limite",
  "sem-localizacao",
]
