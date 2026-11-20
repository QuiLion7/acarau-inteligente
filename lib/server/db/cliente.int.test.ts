import { eq, sql } from "drizzle-orm"

import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"
import { sessao, tentativaLogin } from "@/lib/server/db/schema"

const banco = criarBancoDeTeste()

beforeEach(() => limparTabelas(banco))
afterAll(() => banco.$client.end())

describe("schema migrado no banco de teste", () => {
  it("grava e lê uma sessão, com criada_em preenchida pelo banco e encerrada_em nula", async () => {
    await banco.insert(sessao).values({
      tokenHash: "hash-do-token",
      usuario: "analista",
      impressaoCredencial: "impressao",
    })

    const [lida] = await banco
      .select()
      .from(sessao)
      .where(eq(sessao.tokenHash, "hash-do-token"))

    expect(lida).toMatchObject({
      usuario: "analista",
      impressaoCredencial: "impressao",
      encerradaEm: null,
    })
    expect(lida.criadaEm).toBeInstanceOf(Date)
    expect(lida.ultimaAtividadeEm).toBeInstanceOf(Date)
  })

  it("recusa duas sessões com o mesmo token_hash", async () => {
    const nova = { tokenHash: "igual", usuario: "a", impressaoCredencial: "i" }
    await banco.insert(sessao).values(nova)

    await expect(banco.insert(sessao).values(nova)).rejects.toThrow()
  })

  it("numera as tentativas de login em sequência, que recomeça após a limpeza", async () => {
    await banco.insert(tentativaLogin).values([
      { usuario: "analista", sucesso: false },
      { usuario: "analista", sucesso: true },
    ])

    const tentativas = await banco
      .select()
      .from(tentativaLogin)
      .orderBy(tentativaLogin.id)

    expect(tentativas.map((t) => [t.id, t.sucesso])).toEqual([
      [1, false],
      [2, true],
    ])
    expect(tentativas[0].ocorridaEm).toBeInstanceOf(Date)
  })

  it("tem os índices da TechSpec por usuário", async () => {
    const { rows } = await banco.execute<{ indexname: string }>(
      sql`select indexname from pg_indexes where schemaname = 'public' order by indexname`
    )

    expect(rows.map((r) => r.indexname)).toEqual(
      expect.arrayContaining([
        "sessao_usuario_idx",
        "tentativa_login_usuario_ocorrida_em_idx",
      ])
    )
  })
})
