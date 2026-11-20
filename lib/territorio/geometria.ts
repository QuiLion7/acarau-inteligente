// Geometria plana pura (sem I/O). Coordenadas no SRC em que o chamador trabalha: a carga calcula em EPSG:31984 (metros).
export type Posicao = [number, number]
export type Anel = Posicao[]
/** Primeiro anel é o contorno externo; os demais são furos. */
export type Poligono = Anel[]
export type MultiPoligono = Poligono[]
export type Bbox = [oeste: number, sul: number, leste: number, norte: number]
export type ResultadoLocalizacao = "dentro" | "fronteira" | "fora"
export type MotivoAnelInvalido =
  "coordenada-invalida" | "poucos-pontos" | "aberto" | "autointerseccao"

const MINIMO_PONTOS_ANEL = 4
// Distância (na unidade do SRC) abaixo da qual um ponto é tratado como sobre a aresta.
const TOLERANCIA_FRONTEIRA = 1e-6
const LINHAS_DE_VARREDURA = 9

function produtoVetorial(a: Posicao, b: Posicao, c: Posicao): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}

function distanciaAoSegmento(ponto: Posicao, a: Posicao, b: Posicao): number {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
  const comprimentoAoQuadrado = dx * dx + dy * dy
  if (comprimentoAoQuadrado === 0) {
    return Math.hypot(ponto[0] - a[0], ponto[1] - a[1])
  }
  const projecao = Math.max(
    0,
    Math.min(
      1,
      ((ponto[0] - a[0]) * dx + (ponto[1] - a[1]) * dy) / comprimentoAoQuadrado
    )
  )
  return Math.hypot(
    ponto[0] - (a[0] + projecao * dx),
    ponto[1] - (a[1] + projecao * dy)
  )
}

function areaDoAnel(anel: Anel): number {
  let soma = 0
  for (let indice = 0; indice < anel.length - 1; indice++) {
    const [x1, y1] = anel[indice]
    const [x2, y2] = anel[indice + 1]
    soma += x1 * y2 - x2 * y1
  }
  return Math.abs(soma) / 2
}

/** Área planar (shoelace): contorno externo menos os furos. */
export function areaMultiPoligono(multiPoligono: MultiPoligono): number {
  return multiPoligono.reduce((total, [externo, ...furos]) => {
    const areaFuros = furos.reduce((soma, furo) => soma + areaDoAnel(furo), 0)
    return total + areaDoAnel(externo) - areaFuros
  }, 0)
}

function estaNaAresta(ponto: Posicao, anel: Anel): boolean {
  return anel.some(
    (inicio, indice) =>
      indice < anel.length - 1 &&
      distanciaAoSegmento(ponto, inicio, anel[indice + 1]) <=
        TOLERANCIA_FRONTEIRA
  )
}

function estaDentroDoAnel(ponto: Posicao, anel: Anel): boolean {
  let dentro = false
  for (let indice = 0; indice < anel.length - 1; indice++) {
    const [x1, y1] = anel[indice]
    const [x2, y2] = anel[indice + 1]
    const cruza =
      y1 > ponto[1] !== y2 > ponto[1] &&
      ponto[0] < ((x2 - x1) * (ponto[1] - y1)) / (y2 - y1) + x1
    if (cruza) dentro = !dentro
  }
  return dentro
}

function localizarNoPoligono(
  ponto: Posicao,
  [externo, ...furos]: Poligono
): ResultadoLocalizacao {
  if (estaNaAresta(ponto, externo) || furos.some((f) => estaNaAresta(ponto, f)))
    return "fronteira"
  if (!estaDentroDoAnel(ponto, externo)) return "fora"
  return furos.some((furo) => estaDentroDoAnel(ponto, furo)) ? "fora" : "dentro"
}

/** Aresta ou vértice (inclusive de furo) é `fronteira`; furo por dentro é `fora`. */
export function localizarPonto(
  ponto: Posicao,
  multiPoligono: MultiPoligono
): ResultadoLocalizacao {
  const resultados = multiPoligono.map((poligono) =>
    localizarNoPoligono(ponto, poligono)
  )
  if (resultados.includes("dentro")) return "dentro"
  return resultados.includes("fronteira") ? "fronteira" : "fora"
}

function segmentosSeTocam(a1: Posicao, a2: Posicao, b1: Posicao, b2: Posicao) {
  const [d1, d2] = [produtoVetorial(b1, b2, a1), produtoVetorial(b1, b2, a2)]
  const [d3, d4] = [produtoVetorial(a1, a2, b1), produtoVetorial(a1, a2, b2)]
  if (d1 * d2 < 0 && d3 * d4 < 0) return true
  return (
    distanciaAoSegmento(a1, b1, b2) <= TOLERANCIA_FRONTEIRA ||
    distanciaAoSegmento(a2, b1, b2) <= TOLERANCIA_FRONTEIRA ||
    distanciaAoSegmento(b1, a1, a2) <= TOLERANCIA_FRONTEIRA ||
    distanciaAoSegmento(b2, a1, a2) <= TOLERANCIA_FRONTEIRA
  )
}

function temAutointerseccao(anel: Anel): boolean {
  const arestas = anel.length - 1
  for (let i = 0; i < arestas; i++) {
    for (let j = i + 2; j < arestas; j++) {
      const vizinhasPeloFechamento = i === 0 && j === arestas - 1
      if (vizinhasPeloFechamento) continue
      if (segmentosSeTocam(anel[i], anel[i + 1], anel[j], anel[j + 1]))
        return true
    }
  }
  return false
}

/** Devolve o primeiro defeito do anel, ou `null` se ele é um anel simples e fechado. */
export function validarAnel(anel: Anel): MotivoAnelInvalido | null {
  if (anel.some((posicao) => !posicao.every(Number.isFinite)))
    return "coordenada-invalida"
  if (anel.length < MINIMO_PONTOS_ANEL) return "poucos-pontos"
  const [primeiro, ultimo] = [anel[0], anel[anel.length - 1]]
  if (primeiro[0] !== ultimo[0] || primeiro[1] !== ultimo[1]) return "aberto"
  return temAutointerseccao(anel) ? "autointerseccao" : null
}

export function calcularBbox(multiPoligono: MultiPoligono): Bbox {
  const posicoes = multiPoligono.flat(2)
  const xs = posicoes.map(([x]) => x)
  const ys = posicoes.map(([, y]) => y)
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

function cruzamentosHorizontais(poligono: Poligono, y: number): number[] {
  const xs: number[] = []
  for (const anel of poligono) {
    for (let indice = 0; indice < anel.length - 1; indice++) {
      const [x1, y1] = anel[indice]
      const [x2, y2] = anel[indice + 1]
      // Intervalo semiaberto: um vértice na linha conta uma vez só.
      if (y1 > y !== y2 > y) xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1))
    }
  }
  return xs.toSorted((a, b) => a - b)
}

/** Ponto garantidamente dentro: meio do trecho mais largo de varreduras horizontais no maior polígono. */
export function calcularPontoInterior(multiPoligono: MultiPoligono): Posicao {
  const maior = multiPoligono.toSorted(
    (a, b) => areaMultiPoligono([b]) - areaMultiPoligono([a])
  )[0]
  const [, sul, , norte] = calcularBbox([maior])
  let melhor: { largura: number; ponto: Posicao } | null = null
  for (let passo = 1; passo <= LINHAS_DE_VARREDURA; passo++) {
    const y = sul + ((norte - sul) * passo) / (LINHAS_DE_VARREDURA + 1)
    const xs = cruzamentosHorizontais(maior, y)
    for (let indice = 0; indice + 1 < xs.length; indice += 2) {
      const largura = xs[indice + 1] - xs[indice]
      if (!melhor || largura > melhor.largura) {
        melhor = { largura, ponto: [xs[indice] + largura / 2, y] }
      }
    }
  }
  if (!melhor || localizarPonto(melhor.ponto, multiPoligono) !== "dentro") {
    throw new Error("Não foi possível achar um ponto interior para o polígono.")
  }
  return melhor.ponto
}
