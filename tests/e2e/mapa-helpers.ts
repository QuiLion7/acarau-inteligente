import { readFileSync } from "node:fs"

import { expect, type Locator } from "@playwright/test"

export type PontoGeografico = [longitude: number, latitude: number]
type BairroDoArtefato = {
  id: string
  nome: string
  pontoInterior: PontoGeografico
}

export type EscolaDoArtefato = {
  codigoInep: string
  nome: string
  estado: string
  posicao: PontoGeografico | null
}

const ARTEFATO = JSON.parse(
  readFileSync("dados/gerados/territorio.json", "utf8")
)
export const BAIRROS: BairroDoArtefato[] = ARTEFATO.bairros
export const ESCOLAS: EscolaDoArtefato[] = ARTEFATO.escolas

export function pontoInteriorDe(id: string): PontoGeografico {
  const bairro = BAIRROS.find((candidato) => candidato.id === id)
  if (!bairro) throw new Error(`Bairro ${id} fora do artefato`)
  return bairro.pontoInterior
}

// O MapLibre guarda o mapa no recipiente depois do `load` (gancho de teste); daí sai o pixel de um ponto geográfico.
export type MapaNoRecipiente = {
  project(ponto: PontoGeografico): { x: number; y: number }
  hasImage(nome: string): boolean
  getLayoutProperty(camada: string, propriedade: string): unknown
  getSource(fonte: string): { getData(): Promise<{ features: unknown[] }> }
  getFeatureState(alvo: { source: string; id: string }): {
    selecionado?: boolean
  }
}

export async function aguardarMapaPronto(mapa: Locator) {
  await expect(mapa).toHaveAttribute("data-mapa-pronto", "true")
}

export async function clicarNoPonto(mapa: Locator, ponto: PontoGeografico) {
  const pixel = await mapa.evaluate((recipiente, [lng, lat]) => {
    const { mapa } = recipiente as unknown as { mapa: MapaNoRecipiente }
    return mapa.project([lng, lat])
  }, ponto)
  await mapa.click({ position: pixel })
}

export function bairroEstaSelecionadoNoMapa(mapa: Locator, id: string) {
  return mapa.evaluate((recipiente, idBairro) => {
    const { mapa } = recipiente as unknown as { mapa: MapaNoRecipiente }
    return (
      mapa.getFeatureState({ source: "bairros", id: idBairro }).selecionado ===
      true
    )
  }, id)
}
