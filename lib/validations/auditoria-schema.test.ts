import {
  haFiltroDeAuditoria,
  lerFiltrosAuditoria,
} from "@/lib/validations/auditoria-schema"

const CONTAS = ["analista", "admin"]

describe("lerFiltrosAuditoria (TU-13, CA-05.18)", () => {
  it("sem parâmetros devolve todos os filtros vazios na página 1", () => {
    expect(lerFiltrosAuditoria({}, CONTAS)).toEqual({
      tipo: null,
      conta: null,
      de: null,
      ate: null,
      pagina: 1,
    })
  })

  it("lê tipo, conta, período e página válidos", () => {
    const filtros = lerFiltrosAuditoria(
      {
        tipo: "obra_editada",
        conta: "analista",
        de: "2026-11-01",
        ate: "2026-11-30",
        pagina: "3",
      },
      CONTAS
    )

    expect(filtros).toEqual({
      tipo: "obra_editada",
      conta: "analista",
      de: "2026-11-01",
      ate: "2026-11-30",
      pagina: 3,
    })
  })

  it("aceita 'desconhecida' como conta", () => {
    expect(lerFiltrosAuditoria({ conta: "desconhecida" }, CONTAS).conta).toBe(
      "desconhecida"
    )
  })

  it.each([
    ["tipo fora do catálogo", { tipo: "apagar_tudo" }, "tipo"],
    ["conta que não é do ambiente", { conta: "intruso" }, "conta"],
    ["conta longa demais", { conta: "a".repeat(80) }, "conta"],
    ["data fora do formato", { de: "21/11/2026" }, "de"],
    ["dia que não existe", { ate: "2026-02-30" }, "ate"],
    ["mês que não existe", { de: "2026-13-01" }, "de"],
  ] as const)("ignora %s", (_nome, parametros, campo) => {
    expect(lerFiltrosAuditoria(parametros, CONTAS)[campo]).toBeNull()
  })

  it.each(["0", "-2", "abc", "1.5", "", "999999999"])(
    "página inválida %p volta para a primeira",
    (pagina) => {
      expect(lerFiltrosAuditoria({ pagina }, CONTAS).pagina).toBe(1)
    }
  )

  it("usa o primeiro valor quando o parâmetro vem repetido e ignora os demais campos inválidos sem perder os válidos", () => {
    const filtros = lerFiltrosAuditoria(
      { tipo: ["logout", "login_falha"], de: "ontem", pagina: "2" },
      CONTAS
    )

    expect(filtros).toMatchObject({ tipo: "logout", de: null, pagina: 2 })
  })
})

describe("haFiltroDeAuditoria", () => {
  it("só conta tipo, conta e período; a página não é filtro", () => {
    const base = lerFiltrosAuditoria({ pagina: "4" }, CONTAS)

    expect(haFiltroDeAuditoria(base)).toBe(false)
    expect(haFiltroDeAuditoria({ ...base, tipo: "logout" })).toBe(true)
    expect(haFiltroDeAuditoria({ ...base, conta: "admin" })).toBe(true)
    expect(haFiltroDeAuditoria({ ...base, de: "2026-11-01" })).toBe(true)
    expect(haFiltroDeAuditoria({ ...base, ate: "2026-11-01" })).toBe(true)
  })
})
