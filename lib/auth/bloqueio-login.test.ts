import {
  avaliarBloqueio,
  inicioDaConsulta,
  type LimitesBloqueio,
  type TentativaRecente,
} from "@/lib/auth/bloqueio-login"

const LIMITES: LimitesBloqueio = {
  maxFalhas: 5,
  janelaMin: 15,
  bloqueioMin: 15,
}
const AGORA = new Date("2026-11-20T12:00:00.000Z")

function minutosAntes(minutos: number): Date {
  return new Date(AGORA.getTime() - minutos * 60_000)
}

function falhasHa(...minutos: number[]): TentativaRecente[] {
  return minutos.map((m) => ({ sucesso: false, ocorridaEm: minutosAntes(m) }))
}

describe("avaliarBloqueio", () => {
  it("libera com quatro falhas na janela", () => {
    const resultado = avaliarBloqueio(falhasHa(1, 2, 3, 4), AGORA, LIMITES)

    expect(resultado).toEqual({ bloqueado: false })
  })

  it("bloqueia na quinta falha, esperando o bloqueio contar da última", () => {
    const resultado = avaliarBloqueio(falhasHa(1, 2, 3, 4, 5), AGORA, LIMITES)

    expect(resultado).toEqual({ bloqueado: true, esperaMinutos: 14 })
  })

  it("não conta a falha fora da janela", () => {
    const resultado = avaliarBloqueio(falhasHa(1, 2, 3, 4, 17), AGORA, LIMITES)

    expect(resultado).toEqual({ bloqueado: false })
  })

  it("conta a falha que está exatamente no limite da janela, mas não um instante além", () => {
    const noLimite = [...falhasHa(1, 2, 3, 4), ...falhasHa(16)]
    const alemDoLimite = [
      ...falhasHa(1, 2, 3, 4),
      { sucesso: false, ocorridaEm: new Date(minutosAntes(16).getTime() - 1) },
    ]

    expect(avaliarBloqueio(noLimite, AGORA, LIMITES).bloqueado).toBe(true)
    expect(avaliarBloqueio(alemDoLimite, AGORA, LIMITES).bloqueado).toBe(false)
  })

  it("mantém o bloqueio até o fim mesmo depois de as primeiras falhas saírem da janela de agora", () => {
    // Cinco falhas de 14 a 10 minutos atrás: com janela de 3 minutos elas nem formam um grupo;
    // com janela de 5 formam, e o bloqueio dura até 5 minutos a partir de agora.
    const falhas = falhasHa(14, 13, 12, 11, 10)

    expect(
      avaliarBloqueio(falhas, AGORA, { ...LIMITES, janelaMin: 3 })
    ).toEqual({ bloqueado: false })
    expect(
      avaliarBloqueio(falhas, AGORA, { ...LIMITES, janelaMin: 5 })
    ).toEqual({ bloqueado: true, esperaMinutos: 5 })
  })

  it("zera a contagem com um sucesso depois das falhas", () => {
    const tentativas = [
      ...falhasHa(5, 6, 7, 8, 9),
      { sucesso: true, ocorridaEm: minutosAntes(2) },
    ]

    expect(avaliarBloqueio(tentativas, AGORA, LIMITES)).toEqual({
      bloqueado: false,
    })
  })

  it("só conta as falhas posteriores ao último sucesso, em qualquer ordem de entrada", () => {
    const tentativas: TentativaRecente[] = [
      { sucesso: false, ocorridaEm: minutosAntes(1) },
      { sucesso: false, ocorridaEm: minutosAntes(2) },
      { sucesso: true, ocorridaEm: minutosAntes(3) },
      { sucesso: false, ocorridaEm: minutosAntes(4) },
      { sucesso: false, ocorridaEm: minutosAntes(5) },
      { sucesso: false, ocorridaEm: minutosAntes(6) },
    ]

    expect(avaliarBloqueio(tentativas, AGORA, LIMITES)).toEqual({
      bloqueado: false,
    })
  })

  it("arredonda a espera para cima", () => {
    const ultimaFalha = new Date(AGORA.getTime() - 14 * 60_000 - 30_000)
    const tentativas = [
      ...falhasHa(14.5, 14.6, 14.7, 14.8),
      { sucesso: false, ocorridaEm: ultimaFalha },
    ]

    const resultado = avaliarBloqueio(tentativas, AGORA, LIMITES)

    expect(resultado).toEqual({ bloqueado: true, esperaMinutos: 1 })
  })

  it("libera quando o tempo de bloqueio acaba, mesmo com as cinco falhas ainda na janela", () => {
    const limites = { ...LIMITES, bloqueioMin: 10 }

    expect(
      avaliarBloqueio(falhasHa(11, 12, 13, 14, 14.5), AGORA, limites)
    ).toEqual({ bloqueado: false })
    expect(
      avaliarBloqueio(falhasHa(9, 12, 13, 14, 14.5), AGORA, limites)
    ).toEqual({ bloqueado: true, esperaMinutos: 1 })
  })

  it("não bloqueia sem tentativas", () => {
    expect(avaliarBloqueio([], AGORA, LIMITES)).toEqual({ bloqueado: false })
  })

  it("não altera a lista recebida", () => {
    const tentativas = falhasHa(1, 2, 3, 4, 5)
    const copia = [...tentativas]

    avaliarBloqueio(tentativas, AGORA, LIMITES)

    expect(tentativas).toEqual(copia)
  })
})

describe("inicioDaConsulta", () => {
  it("alcança a janela mais o bloqueio, que é o quanto uma falha ainda pesa", () => {
    expect(inicioDaConsulta(AGORA, LIMITES)).toEqual(minutosAntes(30))
  })
})
