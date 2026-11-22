import { count } from "drizzle-orm"

import { dataset, obra } from "@/lib/server/db/schema"
import { semearDemo } from "@/lib/server/demo/semear-demo"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"

const AGORA = new Date("2026-11-22T12:00:00.000Z")
const banco = criarBancoDeTeste()

async function contar(tabela: typeof dataset | typeof obra) {
  const [linha] = await banco.select({ total: count() }).from(tabela)
  return linha?.total ?? 0
}

beforeEach(async () => {
  await limparTabelas(banco)
  jest.spyOn(process.stdout, "write").mockImplementation(() => true)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("semearDemo (TI-10, CA-05.22)", () => {
  it("num banco vazio carrega o dataset e as 8 obras de exemplo e registra demo.semeado", async () => {
    const escrita = jest.mocked(process.stdout.write)

    const resultado = await semearDemo(banco, AGORA)

    expect(resultado).toEqual({ dataset: "criado", obras: "criadas" })
    expect(await contar(dataset)).toBe(1)
    expect(await contar(obra)).toBe(8)
    const linhas = escrita.mock.calls.map(([linha]) =>
      JSON.parse(String(linha))
    )
    expect(linhas).toContainEqual(
      expect.objectContaining({
        evento: "demo.semeado",
        dataset: "criado",
        obras: "criadas",
      })
    )
  })

  it("rodar duas vezes não duplica nada", async () => {
    await semearDemo(banco, AGORA)

    const resultado = await semearDemo(banco, AGORA)

    expect(resultado).toEqual({ dataset: "existente", obras: "existentes" })
    expect(await contar(dataset)).toBe(1)
    expect(await contar(obra)).toBe(8)
  })
})
