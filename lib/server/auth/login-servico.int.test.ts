import { sql } from "drizzle-orm"

import { lerAmbiente, type Ambiente } from "@/lib/config/ambiente"
import { entrar } from "@/lib/server/auth/login-servico"
import { obterBanco } from "@/lib/server/db/cliente"
import { sessao, tentativaLogin } from "@/lib/server/db/schema"
import {
  criarAmbienteDeTeste,
  SENHA_ANALISTA,
  USUARIO_ANALISTA,
} from "@/test/ambiente-teste"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"

jest.mock("@/lib/server/db/cliente", () => ({
  ...jest.requireActual("@/lib/server/db/cliente"),
  obterBanco: jest.fn(),
}))
jest.mock("@/lib/config/ambiente", () => ({
  ...jest.requireActual("@/lib/config/ambiente"),
  lerAmbiente: jest.fn(),
}))

const REQUEST_ID = "6f1c2a9e-3b7d-4c11-9a0e-2d5b8f7c4e10"
const AGORA = new Date("2026-11-20T12:00:00.000Z")
const SENHA_ERRADA = "senha-errada"

const banco = criarBancoDeTeste()
let ambiente: Ambiente

function minutosDepois(minutos: number): Date {
  return new Date(AGORA.getTime() + minutos * 60_000)
}

async function contar(tabela: typeof sessao | typeof tentativaLogin) {
  const [linha] = await banco
    .select({ total: sql<number>`count(*)::int` })
    .from(tabela)
  return linha.total
}

beforeAll(async () => {
  ambiente = await criarAmbienteDeTeste()
})

beforeEach(async () => {
  jest.mocked(obterBanco).mockReturnValue(banco)
  jest.mocked(lerAmbiente).mockReturnValue(ambiente)
  jest.spyOn(process.stdout, "write").mockImplementation(() => true)
  await limparTabelas(banco)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("entrar", () => {
  it("cria a sessão e devolve a identificação com o papel da conta quando a senha confere", async () => {
    const resultado = await entrar(
      USUARIO_ANALISTA,
      SENHA_ANALISTA,
      AGORA,
      REQUEST_ID
    )

    expect(resultado).toMatchObject({
      tipo: "sucesso",
      sessao: {
        usuario: USUARIO_ANALISTA,
        nome: "Analista Demo",
        papel: "analista",
      },
    })
    expect(await contar(sessao)).toBe(1)
  })

  it("aceita o usuário com espaços e maiúsculas, registrando o nome normalizado", async () => {
    const resultado = await entrar(
      `  ${USUARIO_ANALISTA.toUpperCase()} `,
      SENHA_ANALISTA,
      AGORA,
      REQUEST_ID
    )

    expect(resultado.tipo).toBe("sucesso")
    const [tentativa] = await banco.select().from(tentativaLogin)
    expect(tentativa).toMatchObject({
      usuario: USUARIO_ANALISTA,
      sucesso: true,
    })
  })

  it("devolve a mesma resposta para usuário inexistente e para senha errada, e registra as duas tentativas", async () => {
    const inexistente = await entrar("ninguem", SENHA_ERRADA, AGORA, REQUEST_ID)
    const senhaErrada = await entrar(
      USUARIO_ANALISTA,
      SENHA_ERRADA,
      AGORA,
      REQUEST_ID
    )

    expect(inexistente).toEqual({ tipo: "credenciais-invalidas" })
    expect(senhaErrada).toEqual(inexistente)
    const tentativas = await banco.select().from(tentativaLogin)
    expect(tentativas.map((t) => [t.usuario, t.sucesso]).sort()).toEqual([
      ["analista-teste", false],
      ["ninguem", false],
    ])
    expect(await contar(sessao)).toBe(0)
  })

  it("bloqueia na sexta tentativa mesmo com a senha certa e libera quando o bloqueio acaba, com o relógio injetado", async () => {
    for (let minuto = 0; minuto < 5; minuto++) {
      const falha = await entrar(
        USUARIO_ANALISTA,
        SENHA_ERRADA,
        minutosDepois(minuto),
        REQUEST_ID
      )
      expect(falha.tipo).toBe("credenciais-invalidas")
    }

    const bloqueada = await entrar(
      USUARIO_ANALISTA,
      SENHA_ANALISTA,
      minutosDepois(5),
      REQUEST_ID
    )
    expect(bloqueada).toEqual({ tipo: "bloqueado", esperaMinutos: 14 })
    expect(await contar(tentativaLogin)).toBe(5)
    expect(await contar(sessao)).toBe(0)

    const antesDoFim = await entrar(
      USUARIO_ANALISTA,
      SENHA_ANALISTA,
      minutosDepois(18),
      REQUEST_ID
    )
    expect(antesDoFim.tipo).toBe("bloqueado")

    const liberada = await entrar(
      USUARIO_ANALISTA,
      SENHA_ANALISTA,
      minutosDepois(19),
      REQUEST_ID
    )
    expect(liberada.tipo).toBe("sucesso")
  })

  it("o bloqueio vale também para usuário que não existe, sem revelar isso", async () => {
    for (let minuto = 0; minuto < 5; minuto++) {
      await entrar("ninguem", SENHA_ERRADA, minutosDepois(minuto), REQUEST_ID)
    }

    const resultado = await entrar(
      "ninguem",
      SENHA_ERRADA,
      minutosDepois(5),
      REQUEST_ID
    )

    expect(resultado).toEqual({ tipo: "bloqueado", esperaMinutos: 14 })
  })

  it("um login com sucesso zera a contagem de falhas", async () => {
    for (let minuto = 0; minuto < 4; minuto++) {
      await entrar(
        USUARIO_ANALISTA,
        SENHA_ERRADA,
        minutosDepois(minuto),
        REQUEST_ID
      )
    }
    await entrar(USUARIO_ANALISTA, SENHA_ANALISTA, minutosDepois(4), REQUEST_ID)

    const resultado = await entrar(
      USUARIO_ANALISTA,
      SENHA_ERRADA,
      minutosDepois(5),
      REQUEST_ID
    )

    expect(resultado.tipo).toBe("credenciais-invalidas")
  })

  it("respeita o limite de falhas numa rajada simultânea do mesmo usuário, inclusive para a senha certa", async () => {
    const rajada = Array.from({ length: 20 }, (_, posicao) =>
      entrar(
        USUARIO_ANALISTA,
        posicao === 19 ? SENHA_ANALISTA : `${SENHA_ERRADA}-${posicao}`,
        AGORA,
        REQUEST_ID
      )
    )

    const tipos = (await Promise.all(rajada)).map((resultado) => resultado.tipo)

    expect(
      tipos.filter((tipo) => tipo === "credenciais-invalidas")
    ).toHaveLength(5)
    expect(tipos.filter((tipo) => tipo === "bloqueado")).toHaveLength(15)
    expect(await contar(tentativaLogin)).toBe(5)
    expect(await contar(sessao)).toBe(0)
  })

  it("apaga sessões inativas há mais de 7 dias e tentativas com mais de 1 dia, e mantém as recentes", async () => {
    const dias = (n: number) => new Date(AGORA.getTime() - n * 86_400_000)
    await banco.insert(sessao).values([
      {
        tokenHash: "antiga",
        usuario: "x",
        impressaoCredencial: "i",
        ultimaAtividadeEm: dias(8),
      },
      {
        tokenHash: "recente",
        usuario: "x",
        impressaoCredencial: "i",
        ultimaAtividadeEm: dias(6),
      },
    ])
    await banco.insert(tentativaLogin).values([
      { usuario: "x", sucesso: false, ocorridaEm: dias(2) },
      {
        usuario: "y",
        sucesso: false,
        ocorridaEm: new Date(AGORA.getTime() - 3_600_000),
      },
    ])

    await entrar(USUARIO_ANALISTA, SENHA_ANALISTA, AGORA, REQUEST_ID)

    const tokens = (await banco.select().from(sessao)).map((s) => s.tokenHash)
    expect(tokens).toContain("recente")
    expect(tokens).not.toContain("antiga")
    const usuarios = (await banco.select().from(tentativaLogin)).map(
      (t) => t.usuario
    )
    expect(usuarios.sort()).toEqual(["analista-teste", "y"])
  })
})
