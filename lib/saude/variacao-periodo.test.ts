import { calcularVariacao } from "@/lib/saude/variacao-periodo"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"
import type { SerieSaude } from "@/lib/validations/datasets-schema"

const BAIRROS: BairroResumo[] = [
  { id: "uv-01", uv: 1, nome: "Outra Banda", nomeLei: "OUTRA BANDA" },
  { id: "uv-02", uv: 2, nome: "Piranhas", nomeLei: "PIRANHAS" },
  { id: "uv-03", uv: 3, nome: "São Benedito", nomeLei: "SÃO BENEDITO" },
  { id: "uv-04", uv: 4, nome: "Mongubas", nomeLei: "MONGUBAS" },
]

function serieDe(valores: SerieSaude["valores"]): SerieSaude {
  return {
    periodos: ["2024", "2025", "2026"],
    valores,
    foraDaCobertura: {},
  }
}

describe("calcularVariacao (TU-01 a TU-06, DV-36)", () => {
  it("TU-01: compara 2026 com 2025 no conjunto: absoluta, percentual e bairros comparados", () => {
    const serie = serieDe({
      "uv-01": { "2025": 10, "2026": 14 },
      "uv-02": { "2025": 20, "2026": 22 },
    })

    expect(calcularVariacao(serie, "2026", BAIRROS)).toEqual({
      tipo: "comparada",
      periodoAnterior: "2025",
      bairrosComparados: 2,
      atual: 36,
      anterior: 30,
      absoluta: 6,
      percentual: 20,
    })
  })

  it("a variação pode ser negativa, com percentual negativo", () => {
    const serie = serieDe({ "uv-01": { "2025": 40, "2026": 30 } })

    expect(calcularVariacao(serie, "2026", BAIRROS)).toMatchObject({
      absoluta: -10,
      percentual: -25,
    })
  })

  it("TU-02: bairro com dado só no período atual fica fora da comparação e das somas", () => {
    const serie = serieDe({
      "uv-01": { "2025": 10, "2026": 12 },
      "uv-03": { "2026": 99 },
    })

    expect(calcularVariacao(serie, "2026", BAIRROS)).toMatchObject({
      bairrosComparados: 1,
      atual: 12,
      anterior: 10,
    })
  })

  it("bairro com dado só no período anterior também fica fora", () => {
    const serie = serieDe({
      "uv-01": { "2025": 10, "2026": 12 },
      "uv-02": { "2025": 500 },
    })

    expect(calcularVariacao(serie, "2026", BAIRROS)).toMatchObject({
      bairrosComparados: 1,
      anterior: 10,
    })
  })

  it("TU-03: o primeiro período não tem anterior e não devolve número nenhum", () => {
    const serie = serieDe({ "uv-01": { "2024": 5, "2025": 6 } })

    expect(calcularVariacao(serie, "2024", BAIRROS)).toEqual({
      tipo: "sem-periodo-anterior",
    })
  })

  it("período que a série não tem também não tem anterior", () => {
    const serie = serieDe({ "uv-01": { "2025": 6 } })

    expect(calcularVariacao(serie, "1999", BAIRROS)).toEqual({
      tipo: "sem-periodo-anterior",
    })
  })

  it("TU-04: anterior com soma zero devolve só a absoluta, sem percentual", () => {
    const serie = serieDe({
      "uv-01": { "2025": 0, "2026": 7 },
      "uv-02": { "2025": 0, "2026": 3 },
    })

    expect(calcularVariacao(serie, "2026", BAIRROS)).toMatchObject({
      tipo: "comparada",
      anterior: 0,
      absoluta: 10,
      percentual: null,
    })
  })

  it("TU-05: nenhum bairro com dado nos dois períodos devolve sem-bairros-comparaveis, nunca 0%", () => {
    const serie = serieDe({
      "uv-01": { "2025": 10 },
      "uv-02": { "2026": 20 },
    })

    expect(calcularVariacao(serie, "2026", BAIRROS)).toEqual({
      tipo: "sem-bairros-comparaveis",
      periodoAnterior: "2025",
    })
  })

  it("TU-06: zero explícito é comparável; casos vazio (null) não é", () => {
    const serie = serieDe({
      "uv-01": { "2025": 4, "2026": 0 },
      "uv-02": { "2025": null, "2026": 50 },
    })

    expect(calcularVariacao(serie, "2026", BAIRROS)).toMatchObject({
      bairrosComparados: 1,
      atual: 0,
      anterior: 4,
      absoluta: -4,
      percentual: -100,
    })
  })

  it("variação do bairro: só o bairro recebido entra na comparação", () => {
    const serie = serieDe({
      "uv-01": { "2025": 10, "2026": 15 },
      "uv-02": { "2025": 20, "2026": 40 },
    })
    const [outraBanda] = BAIRROS

    expect(calcularVariacao(serie, "2026", [outraBanda!])).toMatchObject({
      bairrosComparados: 1,
      absoluta: 5,
      percentual: 50,
    })
  })
})
