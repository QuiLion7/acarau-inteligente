import { TODOS, type Filtros } from "@/lib/filtros/filtros-url"
import type { SessaoValida } from "@/lib/auth/papeis"
import { confirmarImportacao } from "@/lib/server/datasets/importacao-servico"
import { publicarVersao } from "@/lib/server/datasets/publicacao-servico"
import { garantirObrasPreCarregadas } from "@/lib/server/obras/obras-pre-carregadas"
import { montarRelatorio } from "@/lib/server/relatorios/relatorio-servico"
import { montarAnaliseDataset } from "@/lib/server/datasets/analise-dataset-servico"
import { criarObra } from "@/lib/server/obras/obra-servico"
import { montarAnalisePeriodo } from "@/lib/saude/analise-periodo"
import { listarResumoBairros } from "@/lib/server/territorio/territorio-repositorio"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"
import { bytesSinteticos, DADOS_DO_ROTEIRO } from "@/test/importacao-teste"
import {
  contextoDeEscrita,
  entradaDeObra,
  pontoInteriorDoBairro,
} from "@/test/obras-teste"

const banco = criarBancoDeTeste()
const AGORA = new Date("2026-11-22T12:00:00.000Z")
const SEM_FILTRO: Filtros = { bairro: TODOS, periodo: TODOS }
const VISITANTE = null
const ANALISTA: SessaoValida = {
  usuario: "analista-teste",
  nome: "Analista Demo",
  papel: "analista",
}

async function importarRoteiro(nomeArquivo = "saude-roteiro_DEMO.csv") {
  return confirmarImportacao(banco, {
    arquivo: {
      nome: nomeArquivo,
      bytes: bytesSinteticos("saude-roteiro_DEMO.csv"),
    },
    dados: DADOS_DO_ROTEIRO,
    autor: { usuario: ANALISTA.usuario, nome: ANALISTA.nome },
    agora: AGORA,
  })
}

async function relatorioOk(
  entrada: Partial<Parameters<typeof montarRelatorio>[1]> = {}
) {
  const resultado = await montarRelatorio(banco, {
    filtros: SEM_FILTRO,
    versaoId: null,
    sessao: VISITANTE,
    ...entrada,
  })
  if (resultado.status !== "ok") throw new Error("esperava o relatório")
  return resultado.dados
}

beforeEach(async () => {
  await limparTabelas(banco)
  jest.spyOn(process.stdout, "write").mockImplementation(() => true)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("montarRelatorio: versão privada (TI-01, CA-05.07)", () => {
  it("o visitante que pede uma versão privada recebe 'versao-nao-encontrada', sem nenhum dado dela", async () => {
    const { versaoId } = await importarRoteiro()

    const resultado = await montarRelatorio(banco, {
      filtros: SEM_FILTRO,
      versaoId,
      sessao: VISITANTE,
    })

    expect(resultado).toEqual({ status: "versao-nao-encontrada" })
  })

  it("o analista com a versão privada recebe o relatório com versaoPrivada, o dataset não publicado e a série dela", async () => {
    const { versaoId } = await importarRoteiro()

    const dados = await relatorioOk({ versaoId, sessao: ANALISTA })

    expect(dados.versaoPrivada).toBe(true)
    expect(dados.autor).toBe("Analista Demo")
    expect(dados.saude).toMatchObject({
      estado: "ok",
      dataset: { publicada: false, nome: "Roteiro 2025-2026" },
    })
  })

  it("o visitante sem versão na URL e sem nenhuma publicada não vê a privada: Saúde 'nenhum-dataset'", async () => {
    await importarRoteiro()

    const dados = await relatorioOk()

    expect(dados.saude).toEqual({ estado: "nenhum-dataset" })
    expect(dados.versaoPrivada).toBe(false)
    expect(dados.filtros.periodo).toBeNull()
  })

  it("uma versão que não existe também é 'versao-nao-encontrada'", async () => {
    const resultado = await montarRelatorio(banco, {
      filtros: SEM_FILTRO,
      versaoId: "6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
      sessao: ANALISTA,
    })

    expect(resultado).toEqual({ status: "versao-nao-encontrada" })
  })
})

describe("montarRelatorio: sem dataset publicado (TI-02, CA-05.06)", () => {
  it("a Saúde diz 'nenhum-dataset' e as demais seções saem completas, como as telas", async () => {
    await garantirObrasPreCarregadas(banco)

    const dados = await relatorioOk()

    expect(dados.saude).toEqual({ estado: "nenhum-dataset" })
    expect(dados.autor).toBe("Visitante")
    expect(dados.universo).toBe(
      "24 bairros da sede; não cobre o município inteiro"
    )
    expect(dados.territorio.mapa.bairros).toHaveLength(24)
    expect(dados.educacao.cards).toMatchObject({
      totalCatalogo: 62,
      foraDaCobertura: 33,
    })
    expect(dados.educacao.fonte).toBeTruthy()
    expect(dados.obras.resumo.total).toBe(8)
    expect(dados.obras.lista).toHaveLength(8)
    expect(dados.fontes.datasets).toEqual([])
    expect(dados.fontes.obras.quantidade).toBe(8)
    expect(dados.fontes.camadas.length).toBeGreaterThan(0)
  })
})

describe("montarRelatorio: com o dataset publicado e filtros", () => {
  it("traz os mesmos números que a Saúde calcula para o período mais recente e identifica a versão publicada", async () => {
    const { versaoId } = await importarRoteiro()
    await publicarVersao(banco, versaoId, AGORA)

    const dados = await relatorioOk()

    const resultadoDaTela = await montarAnaliseDataset(banco, {
      versaoId: null,
      papel: "visitante",
    })
    if (resultadoDaTela.status !== "ok") throw new Error("esperava a Saúde")
    const { analise } = resultadoDaTela
    const periodo = analise.periodos.at(-1)!
    expect(dados.versaoPrivada).toBe(false)
    expect(dados.saude).toMatchObject({
      estado: "ok",
      periodo,
      dataset: { publicada: true },
    })
    if (dados.saude.estado !== "ok") return
    expect(dados.saude.analise).toEqual(
      montarAnalisePeriodo(analise, periodo, listarResumoBairros())
    )
    expect(dados.fontes.datasets).toEqual([
      expect.objectContaining({ nome: "Roteiro 2025-2026", versao: 1 }),
    ])
  })

  it("o bairro da URL filtra Obras e Educação e vira o bairro destacado; período inexistente vira 'periodo-sem-dados'", async () => {
    const { versaoId } = await importarRoteiro()
    await publicarVersao(banco, versaoId, AGORA)
    await criarObra(
      banco,
      entradaDeObra({
        titulo: "DEMO - Obra no Centro",
        localizacao: pontoInteriorDoBairro("uv-10"),
      }),
      contextoDeEscrita()
    )
    await criarObra(
      banco,
      entradaDeObra({ titulo: "DEMO - Obra sem ponto" }),
      contextoDeEscrita()
    )

    const dados = await relatorioOk({
      filtros: { bairro: "uv-10", periodo: "1999" },
    })

    expect(dados.filtros.bairro).toMatchObject({ id: "uv-10", nome: "Centro" })
    expect(dados.filtros.periodo).toEqual({ tipo: "sem-dados", valor: "1999" })
    expect(dados.saude).toMatchObject({
      estado: "periodo-sem-dados",
      valor: "1999",
    })
    expect(dados.obras.lista.map(({ titulo }) => titulo)).toEqual([
      "DEMO - Obra no Centro",
    ])
    expect(dados.educacao.escolasDoBairro).not.toBeNull()
    expect(dados.fontes.obras.quantidade).toBe(2)
  })

  it("bairro que não existe é ignorado (relatório de todos) e marcado como não reconhecido, sem eco do valor", async () => {
    const dados = await relatorioOk({
      filtros: { bairro: "<script>x</script>", periodo: TODOS },
    })

    expect(dados.filtros).toMatchObject({
      bairro: null,
      bairroNaoReconhecido: true,
    })
    expect(JSON.stringify(dados)).not.toContain("<script>")
  })
})
