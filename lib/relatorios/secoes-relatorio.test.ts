import { CAMADAS_CARREGADAS } from "@/lib/config/camadas-carregadas"
import { resolverPeriodo, TODOS } from "@/lib/filtros/filtros-url"
import { montarObra } from "@/lib/obras/__fixtures__/obra"
import { filtrarObras, resumirObras } from "@/lib/obras/filtro-obras"
import {
  montarSecaoEducacao,
  montarSecaoFontes,
  montarSecaoObras,
  montarSecaoSaude,
  montarSecaoTerritorio,
} from "@/lib/relatorios/secoes-relatorio"
import type { AnaliseDatasetSaude } from "@/lib/saude/analise-dataset"
import { montarAnalisePeriodo } from "@/lib/saude/analise-periodo"
import { ordenarRanking } from "@/lib/saude/ranking"
import { montarSerieTemporal } from "@/lib/saude/serie-temporal"
import { calcularVariacao } from "@/lib/saude/variacao-periodo"
import {
  listarResumoBairros,
  obterDadosMapaResumo,
  obterDadosTerritorio,
} from "@/lib/server/territorio/territorio-repositorio"
import { foraDaCoberturaDosBairros } from "@/lib/territorio/contagem-cobertura"
import { ANALISE_SAUDE } from "@/test/saude-fixtures"

const bairros = listarResumoBairros()
const centro = bairros.find(({ id }) => id === "uv-10")!
const rodagem = bairros.find(({ id }) => id === "uv-13")!
const dados = obterDadosTerritorio()

function resolucao(
  periodo = TODOS,
  analise: AnaliseDatasetSaude = ANALISE_SAUDE
) {
  return resolverPeriodo({ bairro: TODOS, periodo }, analise.periodos)
}

describe("montarSecaoSaude (TU-01, TU-02, CA-05.04, CA-05.06)", () => {
  it("devolve o mesmo total, classes e ranking que a tela calcula para o período mais recente", () => {
    const secao = montarSecaoSaude({
      analise: ANALISE_SAUDE,
      resolucao: resolucao(),
      bairros,
      bairroSelecionado: null,
    })

    expect(secao.estado).toBe("ok")
    if (secao.estado !== "ok") return
    const daTela = montarAnalisePeriodo(ANALISE_SAUDE, "2026", bairros)
    expect(secao.periodo).toBe("2026")
    expect(secao.analise).toEqual(daTela)
    expect(secao.ranking).toEqual(ordenarRanking(daTela.bairros).ranking)
    expect(secao.semDados).toEqual(ordenarRanking(daTela.bairros).semDados)
    expect(secao.variacao).toEqual(
      calcularVariacao(ANALISE_SAUDE, "2026", bairros)
    )
    expect(secao.serie).toEqual(montarSerieTemporal(ANALISE_SAUDE, null))
    expect(secao.analise.total).toEqual({ casos: 51, bairrosComDados: 2 })
    expect(secao.destaqueDoBairro).toBeNull()
    expect(secao.bairroSemDado).toBe(false)
  })

  it("com um período pedido na URL usa esse período, não o mais recente", () => {
    const secao = montarSecaoSaude({
      analise: ANALISE_SAUDE,
      resolucao: resolucao("2025"),
      bairros,
      bairroSelecionado: null,
    })

    expect(secao).toMatchObject({ estado: "ok", periodo: "2025" })
    if (secao.estado !== "ok") return
    expect(secao.analise.total.casos).toBe(30)
  })

  it("com um bairro filtrado traz o destaque do bairro e a série dele, como os cards da tela", () => {
    const secao = montarSecaoSaude({
      analise: ANALISE_SAUDE,
      resolucao: resolucao(),
      bairros,
      bairroSelecionado: centro,
    })

    if (secao.estado !== "ok") throw new Error("esperava a Saúde com dados")
    expect(secao.destaqueDoBairro).toMatchObject({
      posicao: 1,
      totalNoRanking: 2,
      item: { bairro: { id: "uv-10" }, casos: 51, situacao: "valor" },
      variacao: calcularVariacao(ANALISE_SAUDE, "2026", [centro]),
    })
    expect(secao.serie).toEqual(montarSerieTemporal(ANALISE_SAUDE, "uv-10"))
  })

  it("marca bairro sem dado no período sem transformar a ausência em zero", () => {
    const secao = montarSecaoSaude({
      analise: ANALISE_SAUDE,
      resolucao: resolucao(),
      bairros,
      bairroSelecionado: rodagem,
    })

    if (secao.estado !== "ok") throw new Error("esperava a Saúde com dados")
    expect(secao.bairroSemDado).toBe(true)
    expect(secao.destaqueDoBairro).toMatchObject({
      posicao: null,
      item: { casos: null, situacao: "sem-dados" },
    })
  })

  it("período que o dataset não tem vira 'periodo-sem-dados' com o valor pedido e a identificação do dataset", () => {
    const secao = montarSecaoSaude({
      analise: ANALISE_SAUDE,
      resolucao: resolucao("1999"),
      bairros,
      bairroSelecionado: null,
    })

    expect(secao).toMatchObject({
      estado: "periodo-sem-dados",
      valor: "1999",
      periodos: ["2025", "2026"],
      dataset: { nome: "Roteiro 2025-2026", versaoNumero: 1, publicada: true },
    })
    expect(secao).not.toHaveProperty("analise")
  })

  it("sem dataset visível o estado é 'nenhum-dataset', sem nenhum número", () => {
    const secao = montarSecaoSaude({
      analise: null,
      resolucao: null,
      bairros,
      bairroSelecionado: null,
    })

    expect(secao).toEqual({ estado: "nenhum-dataset" })
  })

  it("identifica a versão não publicada e a granularidade do dataset", () => {
    const privada: AnaliseDatasetSaude = {
      ...ANALISE_SAUDE,
      versao: {
        ...ANALISE_SAUDE.versao,
        situacao: "privado",
        publicadoEm: null,
      },
    }

    const secao = montarSecaoSaude({
      analise: privada,
      resolucao: resolucao(TODOS, privada),
      bairros,
      bairroSelecionado: null,
    })

    expect(secao).toMatchObject({
      dataset: { publicada: false, granularidade: "ano" },
    })
  })
})

describe("montarSecaoEducacao (TU-03, CA-05.04)", () => {
  it("usa qualidade e totalEscolas do artefato e fecha 24 + 33 + 1 + 4 = 62", () => {
    const secao = montarSecaoEducacao({
      dados,
      camadaEscolas: CAMADAS_CARREGADAS.find(({ id }) => id === "escolas"),
      bairroSelecionado: null,
    })

    const { cards } = secao
    expect(cards).toMatchObject({
      totalCatalogo: 62,
      comLocalizacao: 58,
      semLocalizacao: 4,
      dentroDeBairros: 24,
      foraDaCobertura: 33,
      foraDoLimite: 1,
    })
    expect(
      cards.dentroDeBairros +
        cards.foraDaCobertura +
        cards.foraDoLimite +
        cards.semLocalizacao
    ).toBe(cards.totalCatalogo)
    expect(cards.foraDaCobertura).toBe(
      foraDaCoberturaDosBairros(dados.qualidade)
    )
    expect(secao.porBairro).toHaveLength(24)
    expect(secao.porBairro.reduce((soma, { total }) => soma + total, 0)).toBe(
      dados.qualidade.dentroDeBairros
    )
    expect(secao.pendencias.semLocalizacao).toHaveLength(4)
    expect(secao.pendencias.foraDoLimite).toHaveLength(1)
    expect(secao.escolasDoBairro).toBeNull()
  })

  it("lista as escolas do bairro filtrado e nenhuma de outro bairro", () => {
    const comEscola = dados.bairros.find(
      ({ totalEscolas }) => totalEscolas > 0
    )!
    const bairro = bairros.find(({ id }) => id === comEscola.id)!

    const secao = montarSecaoEducacao({
      dados,
      camadaEscolas: undefined,
      bairroSelecionado: bairro,
    })

    expect(secao.escolasDoBairro).toHaveLength(comEscola.totalEscolas)
    const codigos = new Set(
      secao.escolasDoBairro?.map(({ codigoInep }) => codigoInep)
    )
    for (const escola of dados.escolas) {
      expect(codigos.has(escola.codigoInep)).toBe(
        escola.estado === "dentro-de-bairro" && escola.bairroId === comEscola.id
      )
    }
  })

  it("bairro sem escola dá lista vazia (não null), e o bairro sem escola na base não vira 'sem dado'", () => {
    const semEscola = dados.bairros.find(
      ({ totalEscolas }) => totalEscolas === 0
    )!
    const bairro = bairros.find(({ id }) => id === semEscola.id)!

    const secao = montarSecaoEducacao({
      dados,
      camadaEscolas: undefined,
      bairroSelecionado: bairro,
    })

    expect(secao.escolasDoBairro).toEqual([])
  })

  it("sem a camada de escolas a fonte é nula (fonte ausente), e com ela traz fonte e data de referência", () => {
    const sem = montarSecaoEducacao({
      dados,
      camadaEscolas: undefined,
      bairroSelecionado: null,
    })
    const com = montarSecaoEducacao({
      dados,
      camadaEscolas: { fonte: "INEP", dataReferencia: "Não informada" },
      bairroSelecionado: null,
    })

    expect(sem).toMatchObject({ fonte: null, dataReferencia: null })
    expect(com).toMatchObject({
      fonte: "INEP",
      dataReferencia: "Não informada",
    })
  })
})

describe("montarSecaoObras (TU-04, CA-05.04)", () => {
  const obras = [
    montarObra({
      id: "a",
      titulo: "DEMO - Praça no Centro",
      situacao: "planejada",
      estadoLocalizacao: "dentro-de-bairro",
      bairroId: "uv-10",
      atualizadoEm: "2026-11-03T10:00:00.000Z",
      valorPrevistoCentavos: 25_000_000,
    }),
    montarObra({
      id: "b",
      titulo: "DEMO - Via em Rodagem",
      situacao: "em_andamento",
      estadoLocalizacao: "dentro-de-bairro",
      bairroId: "uv-13",
      atualizadoEm: "2026-11-05T10:00:00.000Z",
    }),
    montarObra({
      id: "c",
      titulo: "<b>DEMO</b> sem ponto",
      situacao: "planejada",
      atualizadoEm: "2026-11-04T10:00:00.000Z",
    }),
  ]

  it("sem filtro mostra todas as obras, do mais recente ao mais antigo, com o resumo da tela", () => {
    const secao = montarSecaoObras({ obras, bairros, bairroId: null })

    expect(secao.lista.map(({ id }) => id)).toEqual(["b", "c", "a"])
    expect(secao.resumo).toEqual(
      resumirObras(filtrarObras(obras, { situacoes: [], bairroId: null }))
    )
    expect(secao.resumo).toMatchObject({ total: 3, semLocalizacao: 1 })
  })

  it("filtra por bairro e resume só as obras dele, como a tela com o mesmo bairro", () => {
    const secao = montarSecaoObras({ obras, bairros, bairroId: "uv-10" })

    expect(secao.lista.map(({ id }) => id)).toEqual(["a"])
    expect(secao.resumo).toEqual(
      resumirObras(filtrarObras(obras, { situacoes: [], bairroId: "uv-10" }))
    )
    expect(secao.resumo.porSituacao).toMatchObject({
      planejada: 1,
      em_andamento: 0,
    })
  })

  it("escreve o bairro pelo nome ou por 'Sem localização', nunca pelo id, e mantém o título como texto", () => {
    const secao = montarSecaoObras({ obras, bairros, bairroId: null })

    const porId = Object.fromEntries(secao.lista.map((obra) => [obra.id, obra]))
    expect(porId.a.bairro).toBe("Centro")
    expect(porId.c.bairro).toBe("Sem localização")
    expect(porId.c.titulo).toBe("<b>DEMO</b> sem ponto")
    expect(secao.lista.every(({ bairro }) => !/^uv-\d+$/.test(bairro))).toBe(
      true
    )
    expect(
      secao.lista.every(({ proveniencia }) => proveniencia === "SINTETICO")
    ).toBe(true)
  })

  it("liga o aviso de valor só quando alguma obra do filtro tem valor", () => {
    expect(montarSecaoObras({ obras, bairros, bairroId: null }).temValor).toBe(
      true
    )
    expect(
      montarSecaoObras({ obras, bairros, bairroId: "uv-13" }).temValor
    ).toBe(false)
  })

  it("sem obras devolve resumo zerado e lista vazia", () => {
    const secao = montarSecaoObras({ obras: [], bairros, bairroId: null })

    expect(secao.resumo.total).toBe(0)
    expect(secao.lista).toEqual([])
    expect(secao.temValor).toBe(false)
  })
})

describe("montarSecaoFontes e montarSecaoTerritorio", () => {
  it("resume as obras (quantidade e última atualização) e lista os datasets publicados", () => {
    const secao = montarSecaoFontes({
      camadas: CAMADAS_CARREGADAS,
      datasets: [
        {
          dataset: { nome: "Roteiro" },
          versao: { numero: 2, publicadoEm: "2026-11-20T15:00:00.000Z" },
        },
      ],
      obras: [
        { atualizadoEm: "2026-11-03T10:00:00.000Z" },
        { atualizadoEm: "2026-11-05T10:00:00.000Z" },
      ],
    })

    expect(secao.camadas.length).toBe(CAMADAS_CARREGADAS.length)
    expect(secao.datasets).toEqual([
      { nome: "Roteiro", versao: 2, publicadoEm: "2026-11-20T15:00:00.000Z" },
    ])
    expect(secao.obras).toEqual({
      quantidade: 2,
      ultimaAtualizacao: "2026-11-05T10:00:00.000Z",
    })
  })

  it("sem obras a última atualização é nula, não uma data inventada", () => {
    expect(
      montarSecaoFontes({ camadas: [], datasets: [], obras: [] }).obras
    ).toEqual({ quantidade: 0, ultimaAtualizacao: null })
  })

  it("o território traz o mapa projetado dos 24 bairros, a fonte da geometria e o aviso de reconstrução", () => {
    const secao = montarSecaoTerritorio(
      obterDadosMapaResumo(),
      CAMADAS_CARREGADAS
    )

    expect(secao.mapa.bairros).toHaveLength(24)
    expect(secao.fonteGeometria).toBe(
      CAMADAS_CARREGADAS.find(({ id }) => id === "bairros")?.fonte
    )
    expect(secao.avisoReconstrucao).toContain("Reconstrução técnica")
  })

  it("sem a camada de bairros a fonte diz 'Fonte ausente'", () => {
    expect(
      montarSecaoTerritorio(obterDadosMapaResumo(), []).fonteGeometria
    ).toBe("Fonte ausente")
  })
})
