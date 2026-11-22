import {
  EVENTOS_AUDITORIA,
  RESULTADOS_AUDITORIA,
  ROTULO_CONTA_DESCONHECIDA,
  ROTULO_SEM_SESSAO,
  TIPOS_EVENTO_AUDITORIA,
  ehTipoEventoAuditoria,
  filtrarDetalhes,
  rotuloDaConta,
} from "@/lib/auditoria/eventos-auditoria"

describe("catálogo de eventos de auditoria (TU-11)", () => {
  it.each(TIPOS_EVENTO_AUDITORIA)(
    "%s tem rótulo em português, resultado válido, evento de log e campos de detalhe",
    (tipo) => {
      const evento = EVENTOS_AUDITORIA[tipo]

      expect(evento.rotulo).toMatch(/^\p{Lu}/u)
      expect(RESULTADOS_AUDITORIA).toContain(evento.resultado)
      expect(evento.eventoLog).toMatch(/^[a-z]+\.[a-z_]+$/)
      expect(["info", "warn"]).toContain(evento.nivelLog)
      expect(Array.isArray(evento.detalhes)).toBe(true)
    }
  )

  it("não repete rótulo nem evento de log entre os tipos", () => {
    const rotulos = TIPOS_EVENTO_AUDITORIA.map(
      (t) => EVENTOS_AUDITORIA[t].rotulo
    )
    const logs = TIPOS_EVENTO_AUDITORIA.map(
      (t) => EVENTOS_AUDITORIA[t].eventoLog
    )

    expect(new Set(rotulos).size).toBe(rotulos.length)
    expect(new Set(logs).size).toBe(logs.length)
  })

  it("nenhum tipo aceita campo que sugira dado sensível ou texto livre", () => {
    const campos = TIPOS_EVENTO_AUDITORIA.flatMap(
      (t) => EVENTOS_AUDITORIA[t].detalhes
    )

    for (const campo of campos) {
      expect(campo).not.toMatch(
        /senha|hash|token|cookie|arquivo|nome|titulo|descricao|usuario/i
      )
    }
  })

  it("marca como recusadas as falhas e como bem-sucedidas as operações concluídas", () => {
    expect(EVENTOS_AUDITORIA.login_falha.resultado).toBe("recusado")
    expect(EVENTOS_AUDITORIA.acesso_negado.resultado).toBe("recusado")
    expect(EVENTOS_AUDITORIA.importacao_duplicada.resultado).toBe("recusado")
    expect(EVENTOS_AUDITORIA.obra_criada.resultado).toBe("sucesso")
    expect(EVENTOS_AUDITORIA.demo_reiniciada.resultado).toBe("sucesso")
  })
})

describe("filtrarDetalhes (TU-11)", () => {
  it("descarta campo fora da lista do tipo e mantém os permitidos", () => {
    const detalhes = filtrarDetalhes("importacao_confirmada", {
      numero: 3,
      linhas: 120,
      nomeArquivo: "casos.csv",
      senha: "x",
    })

    expect(detalhes).toEqual({ numero: 3, linhas: 120 })
  })

  it("descarta objeto, lista, nulo e número não finito, e limita texto longo", () => {
    const detalhes = filtrarDetalhes("acesso_negado", {
      rota: "a".repeat(500),
      motivo: { dentro: "objeto" },
    })
    const numeros = filtrarDetalhes("demo_reiniciada", {
      datasetsRemovidos: Number.NaN,
      obrasRemovidas: null,
    })

    expect(detalhes).toEqual({ rota: "a".repeat(200) })
    expect(numeros).toEqual({})
  })

  it("aceita booleano e devolve vazio quando não há detalhes", () => {
    expect(
      filtrarDetalhes("obra_editada", { situacaoAlterada: false })
    ).toEqual({
      situacaoAlterada: false,
    })
    expect(filtrarDetalhes("logout", { qualquer: "coisa" })).toEqual({})
    expect(filtrarDetalhes("logout", undefined)).toEqual({})
  })
})

describe("ehTipoEventoAuditoria e rotuloDaConta", () => {
  it("reconhece só os tipos do catálogo", () => {
    expect(ehTipoEventoAuditoria("obra_editada")).toBe(true)
    expect(ehTipoEventoAuditoria("qualquer")).toBe(false)
    expect(ehTipoEventoAuditoria(undefined)).toBe(false)
  })

  it("mostra o nome da conta, 'Conta desconhecida' e 'Sem sessão'", () => {
    const nomes = { analista: "Analista Demo" }

    expect(rotuloDaConta("analista", "login_sucesso", nomes)).toBe(
      "Analista Demo"
    )
    expect(rotuloDaConta("outra", "login_sucesso", nomes)).toBe("outra")
    expect(rotuloDaConta(null, "login_falha", nomes)).toBe(
      ROTULO_CONTA_DESCONHECIDA
    )
    expect(rotuloDaConta(null, "acesso_negado", nomes)).toBe(ROTULO_SEM_SESSAO)
  })
})
