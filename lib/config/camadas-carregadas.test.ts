import camadasGeradas from "@/dados/gerados/camadas.json"
import {
  CAMADAS_CARREGADAS,
  montarCamadasCarregadas,
} from "@/lib/config/camadas-carregadas"
import type { ArtefatoCamadas } from "@/lib/territorio/artefato-schema"

const camada = (
  id: ArtefatoCamadas["camadas"][number]["id"],
  dataReferencia: string | null = null
) => ({ id, versao: `versao-${id}`, dataReferencia, registros: 1 })

describe("montarCamadasCarregadas", () => {
  it("lista só as camadas de carga recebidas, na ordem recebida, mais o mapa base fixo", () => {
    const camadas = montarCamadasCarregadas({
      camadas: [camada("bairros"), camada("limite-municipal")],
    })

    expect(camadas.map((c) => c.id)).toEqual([
      "bairros",
      "limite-municipal",
      "mapa-base",
    ])
  })

  it("não anuncia a camada de escolas enquanto a carga não a registrou", () => {
    const camadas = montarCamadasCarregadas({ camadas: [camada("bairros")] })

    expect(camadas.map((c) => c.id)).not.toContain("escolas")
  })

  it("mostra 'Não informada' para data nula e a data quando houver", () => {
    const camadas = montarCamadasCarregadas({
      camadas: [camada("bairros"), camada("escolas", "2026-05-01")],
    })

    expect(camadas.find((c) => c.id === "bairros")?.dataReferencia).toBe(
      "Não informada"
    )
    expect(camadas.find((c) => c.id === "escolas")?.dataReferencia).toBe(
      "2026-05-01"
    )
  })

  it("traz a versão da carga e os textos fixos de cada camada", () => {
    const [bairros] = montarCamadasCarregadas({ camadas: [camada("bairros")] })

    expect(bairros).toMatchObject({
      nome: "Bairros (Unidades de Vizinhança)",
      versao: "versao-bairros",
      etiqueta: "DERIVADO_VALIDAR",
    })
    expect(bairros.limitacoes.length).toBeGreaterThan(0)
  })

  it("devolve lista vazia quando a carga não registrou camada, sem anunciar só o mapa base", () => {
    expect(montarCamadasCarregadas({ camadas: [] })).toEqual([])
  })

  it("descreve o mapa base como colaborativo, OSM e ODbL, sem versão fixa", () => {
    const mapaBase = montarCamadasCarregadas({
      camadas: [camada("bairros")],
    }).at(-1)

    expect(mapaBase).toMatchObject({
      id: "mapa-base",
      etiqueta: "COLABORATIVO",
      fonte: expect.stringContaining("ODbL"),
      versao: "Serviço externo, sem versão fixa",
    })
  })
})

describe("CAMADAS_CARREGADAS (artefato versionado)", () => {
  it("é exatamente bairros, escolas, limite municipal e mapa base", () => {
    expect(CAMADAS_CARREGADAS.map((c) => c.id)).toEqual([
      "bairros",
      "escolas",
      "limite-municipal",
      "mapa-base",
    ])
  })

  it("usa as versões gravadas no camadas.json", () => {
    const versoes = Object.fromEntries(
      camadasGeradas.camadas.map((c) => [c.id, c.versao])
    )

    for (const camadaCarregada of CAMADAS_CARREGADAS.filter(
      (c) => c.id !== "mapa-base"
    )) {
      expect(camadaCarregada.versao).toBe(versoes[camadaCarregada.id])
    }
  })
})
