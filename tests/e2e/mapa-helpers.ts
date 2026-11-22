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
  getFilter(camada: string): unknown
  getLayoutProperty(camada: string, propriedade: string): unknown
  getSource(fonte: string): { getData(): Promise<{ features: unknown[] }> }
  getFeatureState(alvo: { source: string; id: string }): {
    selecionado?: boolean
  }
}

// Os tiles do fundo já são interceptados (fixtures.ts), então o que demora é o WebGL por software do Chromium sem
// GPU criar o mapa e carregar o estilo. Medido em `--repeat-each=8`: de 2,3 s a 4,3 s com a máquina livre. O padrão
// de 5 s do Playwright não deixava folga para a suíte inteira em carga (CR-02); 15 s é cerca de 3,5 vezes o pior
// caso medido. É orçamento de um passo que depende do hardware, não retry nem espera às cegas: se estourar, falha.
const ORCAMENTO_MAPA_PRONTO_MS = 15_000

export async function aguardarMapaPronto(mapa: Locator) {
  await expect(mapa).toHaveAttribute("data-mapa-pronto", "true", {
    timeout: ORCAMENTO_MAPA_PRONTO_MS,
  })
}

export async function clicarNoPonto(mapa: Locator, ponto: PontoGeografico) {
  const pixel = await mapa.evaluate((recipiente, [lng, lat]) => {
    const { mapa } = recipiente as unknown as { mapa: MapaNoRecipiente }
    return mapa.project([lng, lat])
  }, ponto)
  await mapa.click({ position: pixel })
}

/** Features da fonte de obras do mapa: um marcador por obra com ponto (E2E de Obras). */
export function obrasNoMapa(mapa: Locator) {
  return mapa.evaluate(async (recipiente) => {
    const { mapa: instancia } = recipiente as unknown as {
      mapa: MapaNoRecipiente
    }
    const dados = await instancia.getSource("obras").getData()
    return (
      dados.features as { properties: { id: string; titulo: string } }[]
    ).map(({ properties }) => properties)
  })
}

/** Id da obra que a camada de destaque está filtrando; `""` quando nenhuma obra está destacada no mapa. */
export function obraDestacadaNoMapa(mapa: Locator) {
  return mapa.evaluate((recipiente) => {
    const { mapa: instancia } = recipiente as unknown as {
      mapa: MapaNoRecipiente
    }
    const filtro = instancia.getFilter("obras-selecionada") as [
      string,
      unknown,
      string,
    ]
    return filtro[2]
  })
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
