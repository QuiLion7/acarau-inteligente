import type { PontoSerie } from "@/lib/saude/serie-temporal"

// Gráfico por período do relatório em SVG puro (TechSpec EP-05 §2, DEC-T-04): linha, pontos e marcas dos eixos num
// `viewBox` fixo. `null` quebra a linha (como o `connectNulls: false` do gráfico da tela): uma lacuna nunca é ligada
// nem vira zero (RN-05.03).

export type OpcoesGrafico = {
  largura: number
  altura: number
  /** Espaço para os rótulos: esquerda e abaixo precisam de mais que o topo e a direita. */
  margem: { topo: number; direita: number; baixo: number; esquerda: number }
}

export type PontoDoGrafico = {
  periodo: string
  casos: number
  x: number
  y: number
}

export type GraficoSvg = {
  viewBox: string
  largura: number
  altura: number
  /** Um `d` por trecho contínuo com dois ou mais pontos. */
  trechos: string[]
  /** Todos os períodos com valor, inclusive o ponto isolado entre duas lacunas. */
  pontos: PontoDoGrafico[]
  eixoX: { x: number; rotulo: string }[]
  eixoY: { y: number; rotulo: string }[]
  /** Períodos sem valor, na ordem: a legenda do gráfico os cita (a lacuna não é zero). */
  lacunas: string[]
  /** Linha do eixo (x e y do canto) para o desenho dos eixos. */
  area: { esquerda: number; direita: number; topo: number; base: number }
}

const CASAS_DECIMAIS = 10
const MARCAS_DO_EIXO_Y = 4
const formatadorDeCasos = new Intl.NumberFormat("pt-BR")

function arredondar(valor: number): number {
  return Math.round(valor * CASAS_DECIMAIS) / CASAS_DECIMAIS
}

/** Teto "redondo" do eixo y (1, 2, 5 × 10ⁿ) que cobre o maior valor, para as marcas caírem em números limpos. */
function tetoDoEixo(maximo: number): number {
  if (maximo <= 0) return 1
  const potencia = 10 ** Math.floor(Math.log10(maximo))
  const fracao = maximo / potencia
  const passo = [1, 2, 5, 10].find((candidato) => fracao <= candidato) ?? 10
  return passo * potencia
}

export function montarGraficoSvg(
  serie: readonly PontoSerie[],
  { largura, altura, margem }: OpcoesGrafico
): GraficoSvg {
  // Períodos ISO ("2025", "2025-03") ordenam como texto; ordenar aqui não depende de como a série chegou.
  const ordenada = serie.toSorted((a, b) => a.periodo.localeCompare(b.periodo))
  const esquerda = margem.esquerda
  const direita = largura - margem.direita
  const topo = margem.topo
  const base = altura - margem.baixo
  const teto = tetoDoEixo(
    Math.max(0, ...ordenada.map(({ casos }) => casos ?? 0))
  )
  const passoX =
    ordenada.length > 1 ? (direita - esquerda) / (ordenada.length - 1) : 0
  const xDe = (indice: number) =>
    arredondar(
      ordenada.length > 1
        ? esquerda + indice * passoX
        : (esquerda + direita) / 2
    )
  const yDe = (casos: number) =>
    arredondar(base - (casos / teto) * (base - topo))

  const trechos: string[] = []
  const pontos: PontoDoGrafico[] = []
  let atual: string[] = []
  const fecharTrecho = () => {
    if (atual.length > 1) trechos.push(`M${atual.join(" L")}`)
    atual = []
  }
  ordenada.forEach(({ periodo, casos }, indice) => {
    if (casos === null) {
      fecharTrecho()
      return
    }
    const x = xDe(indice)
    const y = yDe(casos)
    pontos.push({ periodo, casos, x, y })
    atual.push(`${x} ${y}`)
  })
  fecharTrecho()

  return {
    viewBox: `0 0 ${largura} ${altura}`,
    largura,
    altura,
    trechos,
    pontos,
    eixoX: ordenada.map(({ periodo }, indice) => ({
      x: xDe(indice),
      rotulo: periodo,
    })),
    eixoY: Array.from({ length: MARCAS_DO_EIXO_Y + 1 }, (_, marca) => {
      const valor = (teto / MARCAS_DO_EIXO_Y) * marca
      return { y: yDe(valor), rotulo: formatadorDeCasos.format(valor) }
    }),
    lacunas: ordenada
      .filter(({ casos }) => casos === null)
      .map(({ periodo }) => periodo),
    area: { esquerda, direita, topo, base },
  }
}
