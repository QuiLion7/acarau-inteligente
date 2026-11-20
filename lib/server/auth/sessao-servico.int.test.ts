import { createHash } from "node:crypto"

import { eq } from "drizzle-orm"

import { buscarConta } from "@/lib/auth/contas-demo"
import { gerarHashSenha } from "@/lib/auth/senha"
import { lerAmbiente, type Ambiente } from "@/lib/config/ambiente"
import {
  criarSessao,
  encerrarSessao,
  validarSessao,
} from "@/lib/server/auth/sessao-servico"
import { obterBanco } from "@/lib/server/db/cliente"
import { sessao } from "@/lib/server/db/schema"
import { criarAmbienteDeTeste, USUARIO_ANALISTA } from "@/test/ambiente-teste"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"

jest.mock("@/lib/server/db/cliente", () => ({
  ...jest.requireActual("@/lib/server/db/cliente"),
  obterBanco: jest.fn(),
}))
jest.mock("@/lib/config/ambiente", () => ({
  ...jest.requireActual("@/lib/config/ambiente"),
  lerAmbiente: jest.fn(),
}))

const AGORA = new Date("2026-11-20T12:00:00.000Z")

const banco = criarBancoDeTeste()
let ambiente: Ambiente

function minutosDepois(minutos: number): Date {
  return new Date(AGORA.getTime() + minutos * 60_000)
}

async function criarSessaoDoAnalista() {
  const conta = buscarConta(USUARIO_ANALISTA, ambiente)
  if (!conta) throw new Error("conta de teste ausente")
  return criarSessao(conta, AGORA)
}

async function ultimaAtividade(token: string): Promise<Date | undefined> {
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const [linha] = await banco
    .select()
    .from(sessao)
    .where(eq(sessao.tokenHash, tokenHash))
  return linha?.ultimaAtividadeEm
}

beforeAll(async () => {
  ambiente = await criarAmbienteDeTeste()
})

beforeEach(async () => {
  jest.mocked(obterBanco).mockReturnValue(banco)
  jest.mocked(lerAmbiente).mockReturnValue(ambiente)
  await limparTabelas(banco)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("criarSessao", () => {
  it("grava só o SHA-256 do token, nunca o token em claro", async () => {
    const { token, sessao: criada } = await criarSessaoDoAnalista()

    const linhas = await banco.select().from(sessao)
    expect(linhas).toHaveLength(1)
    expect(linhas[0].tokenHash).toBe(
      createHash("sha256").update(token).digest("hex")
    )
    expect(JSON.stringify(linhas)).not.toContain(token)
    expect(criada).toEqual({
      usuario: USUARIO_ANALISTA,
      nome: "Analista Demo",
      papel: "analista",
    })
  })

  it("gera um token diferente a cada sessão", async () => {
    const primeira = await criarSessaoDoAnalista()
    const segunda = await criarSessaoDoAnalista()

    expect(primeira.token).not.toBe(segunda.token)
  })
})

describe("validarSessao", () => {
  it("devolve a identificação da conta para sessão ativa", async () => {
    const { token } = await criarSessaoDoAnalista()

    expect(await validarSessao(token, minutosDepois(1))).toEqual({
      usuario: USUARIO_ANALISTA,
      nome: "Analista Demo",
      papel: "analista",
    })
  })

  it("devolve null sem token ou com token desconhecido", async () => {
    await criarSessaoDoAnalista()

    expect(await validarSessao(undefined, AGORA)).toBeNull()
    expect(await validarSessao("", AGORA)).toBeNull()
    expect(await validarSessao("token-que-nao-existe", AGORA)).toBeNull()
  })

  it("devolve null depois de a sessão ser encerrada", async () => {
    const { token } = await criarSessaoDoAnalista()
    expect(await validarSessao(token, minutosDepois(1))).not.toBeNull()

    await encerrarSessao(token, minutosDepois(2))

    expect(await validarSessao(token, minutosDepois(3))).toBeNull()
  })

  it("ainda vale com exatos 120 minutos sem atividade", async () => {
    const { token } = await criarSessaoDoAnalista()

    expect(await validarSessao(token, minutosDepois(120))).not.toBeNull()
  })

  it("devolve null com mais de 120 minutos sem atividade", async () => {
    const { token } = await criarSessaoDoAnalista()

    expect(await validarSessao(token, minutosDepois(121))).toBeNull()
  })

  it("renova a atividade quando passaram mais de 5 minutos, para a expiração contar da última atividade", async () => {
    const { token } = await criarSessaoDoAnalista()

    await validarSessao(token, minutosDepois(100))

    expect(await ultimaAtividade(token)).toEqual(minutosDepois(100))
    expect(await validarSessao(token, minutosDepois(200))).not.toBeNull()
  })

  it("não escreve no banco quando a última atividade tem menos de 5 minutos", async () => {
    const { token } = await criarSessaoDoAnalista()

    await validarSessao(token, minutosDepois(4))

    expect(await ultimaAtividade(token)).toEqual(AGORA)
  })

  it("devolve null quando a senha da conta mudou no ambiente", async () => {
    const { token } = await criarSessaoDoAnalista()
    jest.mocked(lerAmbiente).mockReturnValue({
      ...ambiente,
      DEMO_ANALISTA_SENHA_HASH: await gerarHashSenha("nova-senha-do-analista"),
    })

    expect(await validarSessao(token, minutosDepois(1))).toBeNull()
  })

  it("devolve null quando a conta deixou de existir no ambiente", async () => {
    const { token } = await criarSessaoDoAnalista()
    jest.mocked(lerAmbiente).mockReturnValue({
      ...ambiente,
      DEMO_ANALISTA_USUARIO: "outro-analista",
    })

    expect(await validarSessao(token, minutosDepois(1))).toBeNull()
  })

  it("usa o papel que a conta tem agora no ambiente, não o de quando a sessão foi criada", async () => {
    const { token } = await criarSessaoDoAnalista()
    // O analista passa a ser a conta do administrador: mesmo usuário e mesmo hash, papel novo.
    jest.mocked(lerAmbiente).mockReturnValue({
      ...ambiente,
      DEMO_ADMIN_USUARIO: ambiente.DEMO_ANALISTA_USUARIO,
      DEMO_ADMIN_SENHA_HASH: ambiente.DEMO_ANALISTA_SENHA_HASH,
      DEMO_ANALISTA_USUARIO: "outro-analista",
    })

    expect(await validarSessao(token, minutosDepois(1))).toMatchObject({
      papel: "administrador",
    })
  })
})

describe("encerrarSessao", () => {
  it("é idempotente e aceita token ausente ou desconhecido", async () => {
    const { token } = await criarSessaoDoAnalista()

    await encerrarSessao(token, minutosDepois(1))
    await encerrarSessao(token, minutosDepois(2))
    await encerrarSessao(undefined, minutosDepois(2))
    await encerrarSessao("token-que-nao-existe", minutosDepois(2))

    expect(await validarSessao(token, minutosDepois(3))).toBeNull()
  })

  it("mantém o primeiro instante de encerramento", async () => {
    const { token } = await criarSessaoDoAnalista()

    await encerrarSessao(token, minutosDepois(1))
    await encerrarSessao(token, minutosDepois(30))

    const [linha] = await banco.select().from(sessao)
    expect(linha.encerradaEm).toEqual(minutosDepois(1))
  })
})
