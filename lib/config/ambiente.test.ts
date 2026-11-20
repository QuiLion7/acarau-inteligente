import {
  ErroAmbiente,
  lerAmbiente,
  type FonteAmbiente,
} from "@/lib/config/ambiente"

const HASH_VALIDO = "scrypt:16384:8:1:c2FsLWRlLXRlc3Rl:Y2hhdmUtZGUtdGVzdGU"

const ambienteValido: FonteAmbiente = {
  DATABASE_URL: "postgres://usuario-x:segredo-do-banco@localhost:5432/banco",
  APP_URL: "http://localhost:3000",
  DEMO_ANALISTA_USUARIO: "analista",
  DEMO_ANALISTA_NOME: "Analista Demo",
  DEMO_ANALISTA_SENHA_HASH: HASH_VALIDO,
  DEMO_ADMIN_USUARIO: "admin",
  DEMO_ADMIN_NOME: "Administrador Demo",
  DEMO_ADMIN_SENHA_HASH: HASH_VALIDO,
}

function variaveisInvalidas(fonte: FonteAmbiente): string[] {
  try {
    lerAmbiente(fonte)
  } catch (erro) {
    if (erro instanceof ErroAmbiente) return erro.variaveis
    throw erro
  }
  throw new Error("lerAmbiente não lançou")
}

describe("lerAmbiente", () => {
  it("aplica os padrões das variáveis opcionais", () => {
    const ambiente = lerAmbiente(ambienteValido)

    expect(ambiente).toMatchObject({
      SESSAO_INATIVIDADE_MIN: 120,
      LOGIN_MAX_FALHAS: 5,
      LOGIN_JANELA_MIN: 15,
      LOGIN_BLOQUEIO_MIN: 15,
      LOG_NIVEL: "info",
    })
  })

  it("lê os números informados como inteiros", () => {
    const ambiente = lerAmbiente({
      ...ambienteValido,
      SESSAO_INATIVIDADE_MIN: "30",
      LOGIN_MAX_FALHAS: "3",
    })

    expect(ambiente.SESSAO_INATIVIDADE_MIN).toBe(30)
    expect(ambiente.LOGIN_MAX_FALHAS).toBe(3)
  })

  it("trata variável em branco como ausente", () => {
    expect(variaveisInvalidas({ ...ambienteValido, APP_URL: "  " })).toEqual([
      "APP_URL",
    ])
    expect(
      lerAmbiente({ ...ambienteValido, LOGIN_JANELA_MIN: "" }).LOGIN_JANELA_MIN
    ).toBe(15)
  })

  // TU-01
  it("nomeia as variáveis obrigatórias ausentes sem expor valores", () => {
    const ausentes = ["DEMO_ADMIN_SENHA_HASH", "APP_URL"]
    const incompleto = Object.fromEntries(
      Object.entries(ambienteValido).filter(
        ([nome]) => !ausentes.includes(nome)
      )
    )

    let erro: unknown
    try {
      lerAmbiente(incompleto)
    } catch (capturado) {
      erro = capturado
    }

    expect(erro).toBeInstanceOf(ErroAmbiente)
    const { variaveis, message } = erro as ErroAmbiente
    expect(variaveis.toSorted()).toEqual(["APP_URL", "DEMO_ADMIN_SENHA_HASH"])
    expect(message).toBe(
      "Configuração inválida. Verifique as variáveis: APP_URL, DEMO_ADMIN_SENHA_HASH"
    )
    for (const valor of Object.values(incompleto))
      expect(message).not.toContain(String(valor))
  })

  // TU-02
  it("recusa hash fora do formato nomeando a variável, sem ecoar o valor", () => {
    const hashRuim = "scrypt:isso-nao-e-um-hash-segredo"

    let erro: unknown
    try {
      lerAmbiente({ ...ambienteValido, DEMO_ANALISTA_SENHA_HASH: hashRuim })
    } catch (capturado) {
      erro = capturado
    }

    expect((erro as ErroAmbiente).variaveis).toEqual([
      "DEMO_ANALISTA_SENHA_HASH",
    ])
    expect((erro as ErroAmbiente).message).not.toContain(hashRuim)
  })

  it("recusa usuários repetidos, mesmo com caixa e espaços diferentes", () => {
    const repetidos = { ...ambienteValido, DEMO_ADMIN_USUARIO: "  ANALISTA " }

    expect(variaveisInvalidas(repetidos)).toEqual(["DEMO_ADMIN_USUARIO"])
  })

  it.each(["0", "-5", "1.5", "dez", "5 minutos"])(
    "recusa número não positivo ou inválido (%s)",
    (valor) => {
      expect(
        variaveisInvalidas({ ...ambienteValido, LOGIN_BLOQUEIO_MIN: valor })
      ).toEqual(["LOGIN_BLOQUEIO_MIN"])
    }
  )

  it("recusa URL inválida e nível de log desconhecido", () => {
    const invalidas = variaveisInvalidas({
      ...ambienteValido,
      APP_URL: "localhost",
      LOG_NIVEL: "tudo",
    })

    expect(invalidas.toSorted()).toEqual(["APP_URL", "LOG_NIVEL"])
  })

  it("lista cada variável uma só vez", () => {
    expect(variaveisInvalidas({ ...ambienteValido, DATABASE_URL: "" })).toEqual(
      ["DATABASE_URL"]
    )
  })
})

describe("lerAmbiente sem argumento", () => {
  const original = process.env

  afterEach(() => {
    process.env = original
  })

  it("lê o process.env uma vez e devolve o mesmo objeto nas chamadas seguintes", async () => {
    process.env = { NODE_ENV: "test", ...ambienteValido }
    let primeira: unknown
    let segunda: unknown

    await jest.isolateModulesAsync(async () => {
      const { lerAmbiente: lerIsolado } = await import("@/lib/config/ambiente")
      primeira = lerIsolado()
      process.env = { ...process.env, APP_URL: "http://outra-origem.local" }
      segunda = lerIsolado()
    })

    expect(segunda).toBe(primeira)
    expect(primeira).toMatchObject({ APP_URL: "http://localhost:3000" })
  })
})
