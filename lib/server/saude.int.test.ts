import { criarBanco } from "@/lib/server/db/cliente"
import { verificarSaude } from "@/lib/server/saude"
import { criarBancoDeTeste } from "@/test/banco-teste"

const bancoDeTeste = criarBancoDeTeste()
// Porta 1 nunca tem servidor: a conexão é recusada na hora.
const bancoSemServidor = criarBanco(
  "postgres://usuario-secreto:senha-secreta@host-secreto.invalido:1/banco-secreto"
)

let escrita: jest.SpyInstance

beforeEach(() => {
  escrita = jest.spyOn(process.stdout, "write").mockImplementation(() => true)
})

afterAll(async () => {
  await bancoDeTeste.$client.end()
  await bancoSemServidor.$client.end()
})

describe("verificarSaude", () => {
  it("devolve ok quando o banco responde", async () => {
    const estado = await verificarSaude(bancoDeTeste)

    expect(estado).toEqual({
      status: "ok",
      componentes: { aplicacao: "ok", banco: "ok" },
    })
  })

  it("devolve indisponivel sem host, usuário nem mensagem do driver quando o banco não responde", async () => {
    const estado = await verificarSaude(bancoSemServidor)

    expect(estado).toEqual({
      status: "indisponivel",
      componentes: { aplicacao: "ok", banco: "indisponivel" },
    })
    expect(JSON.stringify(estado)).not.toMatch(
      /secret|invalido|ENOTFOUND|ECONNREFUSED/i
    )
  })

  it("registra saude.banco_indisponivel com o requestId e o erro só no log", async () => {
    await verificarSaude(bancoSemServidor, "req-1")

    const linhas = escrita.mock.calls.map(([linha]) =>
      JSON.parse(String(linha))
    )
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({
      evento: "saude.banco_indisponivel",
      nivel: "warn",
      requestId: "req-1",
    })
    expect(linhas[0].erro).toBeDefined()
  })

  it("devolve indisponivel quando o banco passa de 2 s sem responder", async () => {
    jest.useFakeTimers()
    try {
      const bancoLento = { execute: () => new Promise<never>(() => {}) }

      const pendente = verificarSaude(bancoLento)
      await jest.advanceTimersByTimeAsync(2000)

      await expect(pendente).resolves.toMatchObject({
        status: "indisponivel",
      })
    } finally {
      jest.useRealTimers()
    }
  })
})
