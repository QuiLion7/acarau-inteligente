// Desenho das imagens do mapa (ícones das escolas e hachura de "sem dados"): rasterizado em memória, sem canvas,
// para rodar nos testes de unidade e registrar no `style.load` (TechSpec EP-03 §2, DV-33).
import type { FormaDoIcone, IconeEscola } from "@/lib/territorio/estilo-mapa"

const LADO_ICONE_PX = 24
const MEIO_LADO_ICONE = 11
const ESPESSURA_CONTORNO_ICONE = 3

const DENTRO_DA_FORMA: Record<
  FormaDoIcone,
  (dx: number, dy: number, meioLado: number) => boolean
> = {
  circulo: (dx, dy, meioLado) => Math.hypot(dx, dy) <= meioLado,
  quadrado: (dx, dy, meioLado) =>
    Math.max(Math.abs(dx), Math.abs(dy)) <= meioLado,
  // Ponta para cima: a meia-largura cresce de 0 no topo até `meioLado` na base.
  triangulo: (dx, dy, meioLado) =>
    dy >= -meioLado && dy <= meioLado && Math.abs(dx) <= (dy + meioLado) / 2,
}

function rgbDeHex(cor: string): [number, number, number] {
  const valor = Number.parseInt(cor.slice(1), 16)
  return [(valor >> 16) & 255, (valor >> 8) & 255, valor & 255]
}

export type ImagemRgba = { width: number; height: number; data: Uint8Array }

/** Rasteriza o ícone (forma preenchida com contorno branco, fundo transparente), sem depender de canvas. */
export function desenharIconeEscola(icone: IconeEscola): ImagemRgba {
  const dentro = DENTRO_DA_FORMA[icone.forma]
  const [vermelho, verde, azul] = rgbDeHex(icone.cor)
  const centro = (LADO_ICONE_PX - 1) / 2
  const data = new Uint8Array(LADO_ICONE_PX * LADO_ICONE_PX * 4)
  for (let linha = 0; linha < LADO_ICONE_PX; linha++) {
    for (let coluna = 0; coluna < LADO_ICONE_PX; coluna++) {
      const [dx, dy] = [coluna - centro, linha - centro]
      if (!dentro(dx, dy, MEIO_LADO_ICONE)) continue
      const noMiolo = dentro(dx, dy, MEIO_LADO_ICONE - ESPESSURA_CONTORNO_ICONE)
      const pixel = (linha * LADO_ICONE_PX + coluna) * 4
      data.set(
        noMiolo ? [vermelho, verde, azul, 255] : [255, 255, 255, 255],
        pixel
      )
    }
  }
  return { width: LADO_ICONE_PX, height: LADO_ICONE_PX, data }
}

const LADO_HACHURA_PX = 8
const ESPESSURA_HACHURA_PX = 2
const COR_HACHURA = [107, 114, 128, 255] as const

/** Hachura diagonal cinza sobre fundo transparente (sem dados): diferente de qualquer classe mesmo sem ver cor. */
export function desenharHachuraSemDados(): ImagemRgba {
  const data = new Uint8Array(LADO_HACHURA_PX * LADO_HACHURA_PX * 4)
  for (let linha = 0; linha < LADO_HACHURA_PX; linha++) {
    for (let coluna = 0; coluna < LADO_HACHURA_PX; coluna++) {
      const naDiagonal =
        (coluna + linha) % LADO_HACHURA_PX < ESPESSURA_HACHURA_PX
      if (naDiagonal)
        data.set(COR_HACHURA, (linha * LADO_HACHURA_PX + coluna) * 4)
    }
  }
  return { width: LADO_HACHURA_PX, height: LADO_HACHURA_PX, data }
}
