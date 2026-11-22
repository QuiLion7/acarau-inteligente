import { eq } from "drizzle-orm"

import type { TipoEventoAuditoria } from "@/lib/auditoria/eventos-auditoria"
import {
  CONTA_DESCONHECIDA,
  EVENTOS_POR_PAGINA,
  type FiltrosAuditoria,
} from "@/lib/auditoria/tipos-auditoria"
import {
  inserirEvento,
  listarEventos,
  type EventoParaGravar,
} from "@/lib/server/auditoria/auditoria-repositorio"
import { confirmarImportacao } from "@/lib/server/datasets/importacao-servico"
import { eventoAuditoria } from "@/lib/server/db/schema"
import { criarObra } from "@/lib/server/obras/obra-servico"
import { DADOS_DO_ROTEIRO, bytesSinteticos } from "@/test/importacao-teste"
import { contextoDeEscrita, entradaDeObra } from "@/test/obras-teste"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"

const banco = criarBancoDeTeste()
const BASE = new Date("2026-11-20T15:00:00.000Z")
const SEM_FILTRO: FiltrosAuditoria = {
  tipo: null,
  conta: null,
  de: null,
  ate: null,
  pagina: 1,
}
const CONTAS = [
  { usuario: "analista-teste", nome: "Analista Demo" },
  { usuario: "admin-teste", nome: "Administrador Demo" },
]

function evento(
  sobrescritas: Partial<EventoParaGravar> = {}
): EventoParaGravar {
  return {
    ocorridoEm: BASE,
    tipo: "login_sucesso",
    conta: "analista-teste",
    alvo: null,
    detalhes: {},
    requestId: null,
    ...sobrescritas,
  }
}

function emMinutos(minutos: number): Date {
  return new Date(BASE.getTime() + minutos * 60_000)
}

beforeEach(async () => {
  await limparTabelas(banco)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("inserirEvento e listarEventos (CA-05.15, CA-05.18)", () => {
  it("devolve do mais recente ao mais antigo, com rótulo, resultado e o nome da conta", async () => {
    await inserirEvento(banco, evento({ ocorridoEm: emMinutos(0) }))
    await inserirEvento(
      banco,
      evento({ ocorridoEm: emMinutos(5), tipo: "login_falha", conta: null })
    )
    await inserirEvento(
      banco,
      evento({
        ocorridoEm: emMinutos(9),
        tipo: "demo_reiniciada",
        conta: "admin-teste",
        detalhes: { datasetsRemovidos: 1, obrasRemovidas: 8 },
      })
    )

    const pagina = await listarEventos(banco, SEM_FILTRO, CONTAS)

    expect(pagina.total).toBe(3)
    expect(pagina.eventos.map((e) => e.tipo)).toEqual([
      "demo_reiniciada",
      "login_falha",
      "login_sucesso",
    ])
    expect(pagina.eventos[0]).toMatchObject({
      rotulo: "Demo reiniciada",
      resultado: "sucesso",
      contaRotulo: "Administrador Demo",
      detalhes: { datasetsRemovidos: 1, obrasRemovidas: 8 },
      alvo: null,
    })
    expect(pagina.eventos[1]).toMatchObject({
      resultado: "recusado",
      conta: null,
      contaRotulo: "Conta desconhecida",
    })
  })

  it("desempata eventos do mesmo instante pelo id, do mais novo ao mais antigo", async () => {
    await inserirEvento(banco, evento({ tipo: "login_sucesso" }))
    await inserirEvento(banco, evento({ tipo: "logout" }))

    const pagina = await listarEventos(banco, SEM_FILTRO)

    expect(pagina.eventos.map((e) => e.tipo)).toEqual([
      "logout",
      "login_sucesso",
    ])
  })

  it("combina os filtros de tipo, conta e período (dia inteiro no fuso de Brasília, até inclusivo)", async () => {
    // 21/11 02:30 em Brasília = 05:30 UTC; 21/11 23:30 em Brasília = 22/11 02:30 UTC.
    const noDia = new Date("2026-11-21T05:30:00.000Z")
    const fimDoDia = new Date("2026-11-22T02:30:00.000Z")
    const diaSeguinte = new Date("2026-11-22T03:30:00.000Z")
    await inserirEvento(
      banco,
      evento({ tipo: "obra_editada", ocorridoEm: noDia })
    )
    await inserirEvento(
      banco,
      evento({ tipo: "obra_editada", ocorridoEm: fimDoDia })
    )
    await inserirEvento(
      banco,
      evento({ tipo: "obra_editada", ocorridoEm: diaSeguinte })
    )
    await inserirEvento(
      banco,
      evento({ tipo: "obra_editada", ocorridoEm: noDia, conta: "admin-teste" })
    )
    await inserirEvento(
      banco,
      evento({ tipo: "obra_criada", ocorridoEm: noDia })
    )

    const pagina = await listarEventos(banco, {
      ...SEM_FILTRO,
      tipo: "obra_editada",
      conta: "analista-teste",
      de: "2026-11-21",
      ate: "2026-11-21",
    })

    expect(pagina.total).toBe(2)
    expect(pagina.eventos.map((e) => e.ocorridoEm)).toEqual([
      fimDoDia.toISOString(),
      noDia.toISOString(),
    ])
  })

  it("filtra por conta desconhecida (sem conta gravada)", async () => {
    await inserirEvento(banco, evento({ tipo: "login_falha", conta: null }))
    await inserirEvento(banco, evento())

    const pagina = await listarEventos(banco, {
      ...SEM_FILTRO,
      conta: CONTA_DESCONHECIDA,
    })

    expect(pagina.eventos.map((e) => e.tipo)).toEqual(["login_falha"])
  })

  it("pagina de 25 em 25, informa o total e devolve vazio depois da última página", async () => {
    const lote = Array.from({ length: EVENTOS_POR_PAGINA + 5 }, (_, indice) =>
      evento({ ocorridoEm: emMinutos(indice) })
    )
    for (const item of lote) await inserirEvento(banco, item)

    const primeira = await listarEventos(banco, SEM_FILTRO)
    const segunda = await listarEventos(banco, { ...SEM_FILTRO, pagina: 2 })
    const alem = await listarEventos(banco, { ...SEM_FILTRO, pagina: 9 })

    expect(primeira.eventos).toHaveLength(EVENTOS_POR_PAGINA)
    expect(primeira).toMatchObject({ total: 30, paginas: 2, pagina: 1 })
    expect(segunda.eventos).toHaveLength(5)
    expect(alem.eventos).toEqual([])
    expect(alem.total).toBe(30)
  })

  it("sem eventos devolve uma página só e total zero", async () => {
    const pagina = await listarEventos(banco, SEM_FILTRO)

    expect(pagina).toEqual({ eventos: [], total: 0, paginas: 1, pagina: 1 })
  })

  it("marca se o alvo ainda existe: obra e versão presentes, e obra removida (sem FK)", async () => {
    const obra = await criarObra(banco, entradaDeObra(), contextoDeEscrita())
    const importada = await confirmarImportacao(banco, {
      arquivo: {
        nome: "saude-roteiro_DEMO.csv",
        bytes: bytesSinteticos("saude-roteiro_DEMO.csv"),
      },
      dados: DADOS_DO_ROTEIRO,
      autor: { usuario: "analista-teste", nome: "Analista Demo" },
      agora: BASE,
    })
    const idRemovido = "6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f"
    await inserirEvento(
      banco,
      evento({ tipo: "obra_criada", alvo: { tipo: "obra", id: obra.id } })
    )
    await inserirEvento(
      banco,
      evento({
        tipo: "versao_publicada",
        alvo: { tipo: "dataset_versao", id: importada.versaoId },
      })
    )
    await inserirEvento(
      banco,
      evento({ tipo: "obra_editada", alvo: { tipo: "obra", id: idRemovido } })
    )

    const pagina = await listarEventos(banco, SEM_FILTRO)

    const existePorTipo = Object.fromEntries(
      pagina.eventos.map((e) => [e.tipo, e.alvo?.existe])
    )
    expect(existePorTipo).toEqual({
      obra_criada: true,
      versao_publicada: true,
      obra_editada: false,
    })
  })

  it("o banco recusa tipo fora do catálogo e alvo sem id", async () => {
    await expect(
      inserirEvento(banco, evento({ tipo: "qualquer" as TipoEventoAuditoria }))
    ).rejects.toThrow()
    await expect(
      banco.insert(eventoAuditoria).values({
        ocorridoEm: BASE,
        tipo: "obra_criada",
        resultado: "sucesso",
        alvoTipo: "obra",
        alvoId: null,
      })
    ).rejects.toThrow()
    expect(
      await banco
        .select()
        .from(eventoAuditoria)
        .where(eq(eventoAuditoria.tipo, "obra_criada"))
    ).toEqual([])
  })

  it("com 3.000 eventos filtra por tipo, conta e período e devolve a página em menos de 2 s (TI-08, RNF-05.05)", async () => {
    const tipos: TipoEventoAuditoria[] = [
      "login_sucesso",
      "obra_criada",
      "obra_editada",
      "logout",
    ]
    const lote = Array.from({ length: 3_000 }, (_, indice) => ({
      ocorridoEm: emMinutos(-indice),
      tipo: tipos[indice % tipos.length],
      conta: indice % 2 === 0 ? "analista-teste" : "admin-teste",
      resultado: "sucesso",
      detalhes: {},
    }))
    await banco.insert(eventoAuditoria).values(lote)

    const inicio = performance.now()
    const pagina = await listarEventos(banco, {
      tipo: "obra_editada",
      conta: "analista-teste",
      de: "2026-11-01",
      ate: "2026-11-30",
      pagina: 2,
    })
    const duracaoMs = Math.round(performance.now() - inicio)

    // Índices 2, 6, 10... têm tipo obra_editada; todos eles caem em índice par, então a conta é sempre a do analista.
    expect(pagina.total).toBe(750)
    expect(pagina.eventos).toHaveLength(EVENTOS_POR_PAGINA)
    expect(pagina.paginas).toBe(30)
    expect(duracaoMs).toBeLessThan(2_000)
    // Registro para o QA (RNF-05.05): aparece no resumo do Jest.
    process.stderr.write(
      `[TI-08] página de 3.000 eventos filtrados: ${duracaoMs} ms\n`
    )
  })
})
