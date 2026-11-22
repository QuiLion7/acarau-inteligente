import { POST as entrarRota } from "@/app/api/auth/entrar/route"
import { POST as sairRota } from "@/app/api/auth/sair/route"
import { POST as importarRota } from "@/app/api/importacoes/route"
import { PUT as editarObraRota } from "@/app/api/obras/[id]/route"
import { POST as criarObraRota } from "@/app/api/obras/route"
import { POST as publicarRota } from "@/app/api/datasets/versoes/[id]/publicacao/route"
import { POST as reiniciarRota } from "@/app/api/demo/reset/route"
import { lerAmbiente, type Ambiente } from "@/lib/config/ambiente"
import type { FiltrosAuditoria } from "@/lib/auditoria/tipos-auditoria"
import * as repositorio from "@/lib/server/auditoria/auditoria-repositorio"
import { listarEventos } from "@/lib/server/auditoria/auditoria-repositorio"
import { obterBanco } from "@/lib/server/db/cliente"
import {
  criarAmbienteDeTeste,
  SENHA_ANALISTA,
  USUARIO_ADMIN,
  USUARIO_ANALISTA,
} from "@/test/ambiente-teste"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"
import {
  requisicaoDeImportacao,
  requisicaoDeRota,
  tokenDoUsuario,
} from "@/test/importacao-teste"
import { requisicaoJson } from "@/test/obras-teste"

jest.mock("@/lib/server/db/cliente", () => ({
  ...jest.requireActual("@/lib/server/db/cliente"),
  obterBanco: jest.fn(),
}))
jest.mock("@/lib/config/ambiente", () => ({
  ...jest.requireActual("@/lib/config/ambiente"),
  lerAmbiente: jest.fn(),
}))
jest.mock("@/lib/server/auditoria/auditoria-repositorio", () => ({
  ...jest.requireActual("@/lib/server/auditoria/auditoria-repositorio"),
  inserirEvento: jest.fn(),
}))

const { inserirEvento: inserirEventoReal } = jest.requireActual<
  typeof repositorio
>("@/lib/server/auditoria/auditoria-repositorio")

const banco = criarBancoDeTeste()
let ambiente: Ambiente
const SEM_FILTRO: FiltrosAuditoria = {
  tipo: null,
  conta: null,
  de: null,
  ate: null,
  pagina: 1,
}
const ID_AUSENTE = "6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f"

function contasDoAmbiente() {
  return [
    { usuario: USUARIO_ANALISTA, nome: "Analista Demo" },
    { usuario: USUARIO_ADMIN, nome: "Administrador Demo" },
  ]
}

function entrar(usuario: string, senha: string) {
  return entrarRota(
    requisicaoJson("/api/auth/entrar", {
      metodo: "POST",
      corpo: { usuario, senha },
    })
  )
}

async function eventos() {
  return (await listarEventos(banco, SEM_FILTRO, contasDoAmbiente())).eventos
}

beforeAll(async () => {
  ambiente = await criarAmbienteDeTeste()
})

beforeEach(async () => {
  jest.mocked(obterBanco).mockReturnValue(banco)
  jest.mocked(lerAmbiente).mockReturnValue(ambiente)
  jest.mocked(repositorio.inserirEvento).mockImplementation(inserirEventoReal)
  jest.spyOn(process.stdout, "write").mockImplementation(() => true)
  await limparTabelas(banco)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("auditoria do fluxo do analista (TI-04, CA-05.15)", () => {
  it("grava entrada, importação, publicação, obra criada e obra editada, do mais recente ao mais antigo, com conta, alvo e resultado", async () => {
    const entrou = await entrar(USUARIO_ANALISTA, SENHA_ANALISTA)
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)
    const importada = await (
      await importarRota(await requisicaoDeImportacao({ token }))
    ).json()
    const publicada = await publicarRota(
      requisicaoDeRota(
        `/api/datasets/versoes/${importada.versaoId}/publicacao`,
        {
          metodo: "POST",
          token,
        }
      ),
      { params: Promise.resolve({ id: importada.versaoId }) }
    )
    const criada = await (
      await criarObraRota(
        requisicaoJson("/api/obras", {
          metodo: "POST",
          token,
          corpo: { titulo: "DEMO - Obra da auditoria", situacao: "planejada" },
        })
      )
    ).json()
    const editada = await editarObraRota(
      requisicaoJson(`/api/obras/${criada.id}`, {
        metodo: "PUT",
        token,
        corpo: { titulo: "DEMO - Obra da auditoria", situacao: "em_andamento" },
      }),
      { params: Promise.resolve({ id: criada.id }) }
    )

    expect([entrou.status, publicada.status, editada.status]).toEqual([
      200, 200, 200,
    ])
    const lista = await eventos()
    expect(lista.map((e) => e.tipo)).toEqual([
      "obra_editada",
      "obra_criada",
      "versao_publicada",
      "importacao_confirmada",
      "login_sucesso",
    ])
    expect(lista.every((e) => e.conta === USUARIO_ANALISTA)).toBe(true)
    expect(lista.every((e) => e.resultado === "sucesso")).toBe(true)
    expect(lista[0]).toMatchObject({
      alvo: { tipo: "obra", id: criada.id, existe: true },
      detalhes: { situacaoAlterada: true },
    })
    expect(lista[2]).toMatchObject({
      alvo: { tipo: "dataset_versao", id: importada.versaoId, existe: true },
    })
    expect(lista[3].detalhes).toMatchObject({ numero: 1 })
    expect(lista[0].contaRotulo).toBe("Analista Demo")
  })

  it("grava a saída da sessão e não grava nada quando sair é chamado sem sessão", async () => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    await sairRota(
      requisicaoDeRota("/api/auth/sair", { metodo: "POST", token })
    )
    await sairRota(requisicaoDeRota("/api/auth/sair", { metodo: "POST" }))

    expect((await eventos()).map((e) => [e.tipo, e.conta])).toEqual([
      ["logout", USUARIO_ANALISTA],
    ])
  })

  it("grava a importação duplicada e a recusada sem nome de arquivo nem conteúdo", async () => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)
    await importarRota(await requisicaoDeImportacao({ token }))

    const repetida = await importarRota(await requisicaoDeImportacao({ token }))
    const invalida = await importarRota(
      await requisicaoDeImportacao({
        token,
        arquivo: { nome: "segredo-do-cliente.csv", bytes: new Uint8Array([0]) },
      })
    )

    expect([repetida.status, invalida.status]).toEqual([409, 422])
    const lista = await eventos()
    expect(lista.map((e) => e.tipo).slice(0, 2)).toEqual([
      "importacao_recusada",
      "importacao_duplicada",
    ])
    expect(
      lista.every(
        (e) => e.resultado === "recusado" || e.tipo === "importacao_confirmada"
      )
    ).toBe(true)
    expect(JSON.stringify(lista)).not.toContain("segredo-do-cliente")
  })

  it("grava a obra recusada com o motivo, sem título nem texto da obra", async () => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await criarObraRota(
      requisicaoJson("/api/obras", {
        metodo: "POST",
        token,
        corpo: { titulo: "DEMO - Titulo-secreto", situacao: "inexistente" },
      })
    )

    expect(resposta.status).toBe(400)
    const [recusada] = await eventos()
    expect(recusada).toMatchObject({
      tipo: "obra_recusada",
      resultado: "recusado",
      alvo: null,
    })
    expect(JSON.stringify(recusada)).not.toContain("Titulo-secreto")
  })
})

describe("auditoria do login (TI-05, CA-05.16, CA-05.20 do bloqueio)", () => {
  it("usuário inexistente grava conta nula; senha errada de conta demo grava a conta; nenhum guarda senha nem texto digitado", async () => {
    await entrar("quem-e-voce", "senha-digitada-xyz")
    await entrar(USUARIO_ANALISTA, "outra-senha-errada")

    const lista = await eventos()
    expect(lista.map((e) => [e.tipo, e.conta, e.contaRotulo])).toEqual([
      ["login_falha", USUARIO_ANALISTA, "Analista Demo"],
      ["login_falha", null, "Conta desconhecida"],
    ])
    const texto = JSON.stringify(lista)
    for (const proibido of [
      "quem-e-voce",
      "senha-digitada-xyz",
      "outra-senha-errada",
    ]) {
      expect(texto).not.toContain(proibido)
    }
    expect(lista.every((e) => Object.keys(e.detalhes).length === 0)).toBe(true)
  })

  it("grava o bloqueio na sexta tentativa", async () => {
    for (let tentativa = 0; tentativa < 6; tentativa++) {
      await entrar(USUARIO_ANALISTA, `errada-${tentativa}`)
    }

    const tipos = (await eventos()).map((e) => e.tipo)

    expect(tipos.filter((t) => t === "login_falha")).toHaveLength(5)
    expect(tipos[0]).toBe("login_bloqueado")
  })
})

describe("auditoria e reset da demo (TI-06, CA-05.19, CA-05.32)", () => {
  it("o reset preserva os eventos anteriores, grava demo_reiniciada com as contagens e o alvo da obra removida passa a não existir", async () => {
    const tokenAnalista = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)
    const criada = await (
      await criarObraRota(
        requisicaoJson("/api/obras", {
          metodo: "POST",
          token: tokenAnalista,
          corpo: { titulo: "DEMO - Antes do reset", situacao: "planejada" },
        })
      )
    ).json()
    const antes = await eventos()
    expect(antes[0].alvo).toEqual({ tipo: "obra", id: criada.id, existe: true })

    const tokenAdmin = await tokenDoUsuario(USUARIO_ADMIN, ambiente)
    const reset = await reiniciarRota(
      requisicaoDeRota("/api/demo/reset", {
        metodo: "POST",
        token: tokenAdmin,
      })
    )

    expect(reset.status).toBe(204)
    const depois = await eventos()
    expect(depois.map((e) => e.tipo)).toEqual([
      "demo_reiniciada",
      "obra_criada",
    ])
    expect(depois[0]).toMatchObject({
      conta: USUARIO_ADMIN,
      detalhes: { datasetsRemovidos: 0, obrasRemovidas: 1 },
    })
    expect(depois[1].alvo).toEqual({
      tipo: "obra",
      id: criada.id,
      existe: false,
    })
  })
})

describe("auditoria indisponível (TI-07, CA-05.20)", () => {
  it("a obra é criada com 201 e a falha vai só para o log", async () => {
    jest
      .mocked(repositorio.inserirEvento)
      .mockRejectedValue(new Error("tabela indisponível"))
    const escrita = jest.mocked(process.stdout.write)
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await criarObraRota(
      requisicaoJson("/api/obras", {
        metodo: "POST",
        token,
        corpo: { titulo: "DEMO - Sem auditoria", situacao: "planejada" },
      })
    )

    expect(resposta.status).toBe(201)
    const linhas = escrita.mock.calls.map(([linha]) =>
      JSON.parse(String(linha))
    )
    expect(linhas.map((l) => l.evento)).toEqual(
      expect.arrayContaining(["obra.criada", "auditoria.falha_gravacao"])
    )
    jest.mocked(repositorio.inserirEvento).mockImplementation(inserirEventoReal)
    expect(await eventos()).toEqual([])
  })
})

describe("acesso negado (TI-09, CA-05.17)", () => {
  it("401 sem sessão grava acesso_negado com a rota, sem conta e sem corpo", async () => {
    const resposta = await reiniciarRota(
      requisicaoDeRota("/api/demo/reset", { metodo: "POST" })
    )

    expect(resposta.status).toBe(401)
    const [negado] = await eventos()
    expect(negado).toMatchObject({
      tipo: "acesso_negado",
      conta: null,
      contaRotulo: "Sem sessão",
      resultado: "recusado",
      detalhes: { rota: "/api/demo/reset", motivo: "nao-autenticado" },
    })
  })

  it("403 do analista grava a conta e o motivo", async () => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)

    const resposta = await reiniciarRota(
      requisicaoDeRota("/api/demo/reset", { metodo: "POST", token })
    )

    expect(resposta.status).toBe(403)
    const [negado] = await eventos()
    expect(negado).toMatchObject({
      tipo: "acesso_negado",
      conta: USUARIO_ANALISTA,
      detalhes: { rota: "/api/demo/reset", motivo: "sem-permissao" },
    })
  })

  it("obra editada inexistente grava obra_recusada com o id da rota válido, e id mal formado não vira alvo", async () => {
    const token = await tokenDoUsuario(USUARIO_ANALISTA, ambiente)
    const corpo = { titulo: "DEMO - x", situacao: "planejada" }

    await editarObraRota(
      requisicaoJson(`/api/obras/${ID_AUSENTE}`, {
        metodo: "PUT",
        token,
        corpo,
      }),
      { params: Promise.resolve({ id: ID_AUSENTE }) }
    )
    await editarObraRota(
      requisicaoJson("/api/obras/lixo", { metodo: "PUT", token, corpo }),
      { params: Promise.resolve({ id: "lixo" }) }
    )

    const [malFormado, inexistente] = await eventos()
    expect(inexistente.alvo).toMatchObject({ tipo: "obra", id: ID_AUSENTE })
    expect(inexistente.detalhes).toEqual({ motivo: "NAO_ENCONTRADO" })
    expect(malFormado.alvo).toBeNull()
  })
})
