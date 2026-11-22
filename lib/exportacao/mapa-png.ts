import type { Map as MapaMapLibre } from "maplibre-gl"

import { MAPA_BASE } from "@/lib/config/mapa-base"
import { formatarGeracao } from "@/lib/exportacao/data-geracao"
import type { FormaLegenda } from "@/lib/exportacao/legendas-png"
import type { MolduraPng } from "@/lib/exportacao/moldura-png"
import { CAMADAS_MAPA } from "@/lib/territorio/estilo-mapa"

// PNG do mapa (TechSpec EP-05 §2, §3, DEC-T-13, RF-05.22, RF-05.23): gerado no navegador a partir do canvas do MapLibre,
// com uma moldura de título, filtros, legenda, atribuição do OpenStreetMap e selos. Depende de canvas e de WebGL, por isso
// não roda no Jest e é coberto pelo E2E-04 (fora do gate de cobertura).

export type CapturaMapa = {
  imagem: HTMLCanvasElement
  /** O fundo do OpenStreetMap ficou de fora da captura (canvas contaminado): o PNG leva só o fundo neutro e as camadas. */
  semFundo: boolean
}

const ESPERA_PELO_MAPA_MS = 4_000

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Sem `preserveDrawingBuffer` o canvas WebGL só tem pixels válidos durante o quadro: o `once("render")` roda ao fim do
// quadro e a cópia para um canvas 2D acontece ali, de forma síncrona (DEC-T-13).
function copiarProximoQuadro(mapa: MapaMapLibre): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    mapa.once("render", () => {
      try {
        const origem = mapa.getCanvas()
        const copia = document.createElement("canvas")
        copia.width = origem.width
        copia.height = origem.height
        const contexto = copia.getContext("2d")
        if (!contexto) throw new Error("Canvas 2D indisponível.")
        contexto.drawImage(origem, 0, 0)
        resolve(copia)
      } catch (erro) {
        reject(erro)
      }
    })
    mapa.triggerRepaint()
  })
}

/** Canvas com pixel de origem cruzada sem CORS (tile do OSM sem cabeçalho): ler o pixel lança `SecurityError`. */
function estaContaminado(canvas: HTMLCanvasElement): boolean {
  try {
    canvas.getContext("2d")?.getImageData(0, 0, 1, 1)
    return false
  } catch {
    return true
  }
}

/**
 * Captura o quadro atual do mapa (o enquadramento que o usuário vê). Espera os tiles por um tempo curto. Com o canvas
 * contaminado pelo fundo do OSM, esconde a camada raster, captura de novo e a restaura (R-07, RF-05.23). Com o fundo
 * bloqueado a captura sai normal, só com o fundo neutro.
 */
export async function capturarMapa(mapa: MapaMapLibre): Promise<CapturaMapa> {
  if (!mapa.loaded()) {
    await Promise.race([
      new Promise<void>((resolve) => mapa.once("idle", () => resolve())),
      esperar(ESPERA_PELO_MAPA_MS),
    ])
  }
  const imagem = await copiarProximoQuadro(mapa)
  if (!estaContaminado(imagem)) return { imagem, semFundo: false }

  const camada = CAMADAS_MAPA.fundoOsm
  const visibilidade = mapa.getLayoutProperty(camada, "visibility") ?? "visible"
  mapa.setLayoutProperty(camada, "visibility", "none")
  try {
    return { imagem: await copiarProximoQuadro(mapa), semFundo: true }
  } finally {
    mapa.setLayoutProperty(camada, "visibility", visibilidade)
  }
}

// Medidas em pixels do desenho a 1x; `escala` as ajusta a mapas capturados em telas de alta densidade.
const MARGEM = 16
const ALTURA_DO_TITULO = 28
const ALTURA_DA_LINHA = 20
const ALTURA_DO_ITEM = 22
const LADO_DO_SIMBOLO = 14
const COR_DO_TEXTO = "#111827"
const COR_SUAVE = "#4b5563"
const COR_DA_LINHA = "#d1d5db"
const COR_DO_SELO = "#eef2f7"

function reticencias(
  contexto: CanvasRenderingContext2D,
  texto: string,
  larguraMaxima: number
): string {
  if (contexto.measureText(texto).width <= larguraMaxima) return texto
  let corte = texto.length
  while (
    corte > 1 &&
    contexto.measureText(`${texto.slice(0, corte)}...`).width > larguraMaxima
  ) {
    corte -= 1
  }
  return `${texto.slice(0, corte)}...`
}

function desenharSimbolo(
  contexto: CanvasRenderingContext2D,
  forma: FormaLegenda,
  cor: string,
  x: number,
  y: number,
  lado: number
) {
  const meio = lado / 2
  const [cx, cy] = [x + meio, y + meio]
  contexto.save()
  contexto.fillStyle = cor
  contexto.strokeStyle = COR_DO_TEXTO
  contexto.lineWidth = 1
  contexto.beginPath()
  if (forma === "circulo") contexto.arc(cx, cy, meio, 0, Math.PI * 2)
  else if (forma === "triangulo") {
    contexto.moveTo(cx, y)
    contexto.lineTo(x + lado, y + lado)
    contexto.lineTo(x, y + lado)
    contexto.closePath()
  } else if (forma === "losango") {
    contexto.moveTo(cx, y)
    contexto.lineTo(x + lado, cy)
    contexto.lineTo(cx, y + lado)
    contexto.lineTo(x, cy)
    contexto.closePath()
  } else if (forma === "tracejado") {
    // Linha tracejada: o limite municipal e o zero informado (preenchimento branco, contorno tracejado).
    contexto.fillStyle = "#ffffff"
    contexto.strokeStyle = cor
    contexto.lineWidth = 2
    contexto.setLineDash([3, 2])
    contexto.rect(x, y, lado, lado)
  } else if (forma === "hachura") {
    contexto.fillStyle = "#ffffff"
    contexto.rect(x, y, lado, lado)
  } else {
    contexto.rect(x, y, lado, lado)
  }
  contexto.fill()
  contexto.stroke()
  if (forma === "hachura") {
    contexto.setLineDash([])
    contexto.strokeStyle = COR_SUAVE
    contexto.beginPath()
    for (let deslocamento = 3; deslocamento < lado * 2; deslocamento += 4) {
      contexto.moveTo(
        x + Math.max(0, deslocamento - lado),
        y + Math.min(deslocamento, lado)
      )
      contexto.lineTo(
        x + Math.min(deslocamento, lado),
        y + Math.max(0, deslocamento - lado)
      )
    }
    contexto.stroke()
  }
  contexto.restore()
}

type Medidas = {
  largura: number
  alturaCabecalho: number
  alturaMapa: number
  alturaLegenda: number
  alturaRodape: number
}

function medir(
  captura: CapturaMapa,
  moldura: MolduraPng,
  escala: number
): Medidas {
  const alturaCabecalho =
    MARGEM +
    ALTURA_DO_TITULO +
    moldura.filtros.length * ALTURA_DA_LINHA +
    ALTURA_DA_LINHA +
    MARGEM / 2
  const alturaLegenda =
    moldura.legenda.length === 0
      ? 0
      : MARGEM + ALTURA_DO_ITEM * (moldura.legenda.length + 1)
  const alturaRodape = MARGEM + ALTURA_DA_LINHA + 28 + MARGEM
  return {
    largura: captura.imagem.width,
    alturaCabecalho: alturaCabecalho * escala,
    alturaMapa: captura.imagem.height,
    alturaLegenda: alturaLegenda * escala,
    alturaRodape: alturaRodape * escala,
  }
}

function canvasParaBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("Não foi possível gerar a imagem."))
    }, "image/png")
  })
}

/**
 * Compõe o PNG: faixa de título e filtros, o mapa, a caixa de legenda (forma e texto), a atribuição do OpenStreetMap
 * (sempre, mesmo sem o fundo) e os selos. A data é a do clique, no horário de Brasília.
 */
export async function comporImagemMapa(
  captura: CapturaMapa,
  moldura: MolduraPng,
  agora: Date
): Promise<Blob> {
  const escala = Math.max(1, Math.round(captura.imagem.width / 900))
  const { largura, alturaCabecalho, alturaMapa, alturaLegenda, alturaRodape } =
    medir(captura, moldura, escala)
  const tela = document.createElement("canvas")
  tela.width = largura
  tela.height = Math.round(
    alturaCabecalho + alturaMapa + alturaLegenda + alturaRodape
  )
  const contexto = tela.getContext("2d")
  if (!contexto) throw new Error("Canvas 2D indisponível.")
  const margem = MARGEM * escala
  const larguraDeTexto = largura - 2 * margem

  contexto.fillStyle = "#ffffff"
  contexto.fillRect(0, 0, tela.width, tela.height)
  contexto.textBaseline = "top"

  // Cabeçalho: título, filtros e data de geração.
  let y = margem
  contexto.fillStyle = COR_DO_TEXTO
  contexto.font = `bold ${20 * escala}px Roboto, Arial, sans-serif`
  contexto.fillText(
    reticencias(contexto, moldura.titulo, larguraDeTexto),
    margem,
    y
  )
  y += ALTURA_DO_TITULO * escala
  contexto.font = `${14 * escala}px Roboto, Arial, sans-serif`
  for (const filtro of moldura.filtros) {
    contexto.fillText(reticencias(contexto, filtro, larguraDeTexto), margem, y)
    y += ALTURA_DA_LINHA * escala
  }
  contexto.fillStyle = COR_SUAVE
  contexto.font = `${12 * escala}px Roboto, Arial, sans-serif`
  contexto.fillText(`Gerado em ${formatarGeracao(agora)}`, margem, y)

  // Mapa.
  const topoDoMapa = alturaCabecalho
  contexto.drawImage(captura.imagem, 0, topoDoMapa)
  contexto.strokeStyle = COR_DA_LINHA
  contexto.strokeRect(0.5, topoDoMapa + 0.5, largura - 1, alturaMapa - 1)

  // Legenda: forma + texto em cada item.
  y = topoDoMapa + alturaMapa + margem / 2
  if (moldura.legenda.length > 0) {
    contexto.fillStyle = COR_DO_TEXTO
    contexto.font = `bold ${14 * escala}px Roboto, Arial, sans-serif`
    contexto.fillText("Legenda", margem, y)
    y += ALTURA_DO_ITEM * escala
    contexto.font = `${13 * escala}px Roboto, Arial, sans-serif`
    for (const item of moldura.legenda) {
      desenharSimbolo(
        contexto,
        item.forma,
        item.cor,
        margem,
        y,
        LADO_DO_SIMBOLO * escala
      )
      contexto.fillStyle = COR_DO_TEXTO
      contexto.fillText(
        reticencias(
          contexto,
          item.rotulo,
          larguraDeTexto - (LADO_DO_SIMBOLO + 8) * escala
        ),
        margem + (LADO_DO_SIMBOLO + 8) * escala,
        y
      )
      y += ALTURA_DO_ITEM * escala
    }
    y += margem / 2
  }

  // Atribuição (RN-029) e selos de demonstração.
  contexto.fillStyle = COR_SUAVE
  contexto.font = `${12 * escala}px Roboto, Arial, sans-serif`
  contexto.fillText(MAPA_BASE.atribuicao, margem, y)
  if (captura.semFundo) {
    const larguraAtribuicao = contexto.measureText(MAPA_BASE.atribuicao).width
    contexto.fillText(
      "Fundo do mapa indisponível nesta imagem.",
      margem + larguraAtribuicao + 12 * escala,
      y
    )
  }
  y += ALTURA_DA_LINHA * escala
  let x = margem
  contexto.font = `bold ${12 * escala}px Roboto, Arial, sans-serif`
  for (const selo of moldura.selos) {
    const larguraDoSelo = contexto.measureText(selo).width + 16 * escala
    contexto.fillStyle = COR_DO_SELO
    contexto.fillRect(x, y, larguraDoSelo, 24 * escala)
    contexto.strokeStyle = COR_DA_LINHA
    contexto.strokeRect(x + 0.5, y + 0.5, larguraDoSelo - 1, 24 * escala - 1)
    contexto.fillStyle = COR_DO_TEXTO
    contexto.fillText(selo, x + 8 * escala, y + 5 * escala)
    x += larguraDoSelo + 8 * escala
  }

  return canvasParaBlob(tela)
}
