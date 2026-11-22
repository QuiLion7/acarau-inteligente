import type { ItemBairroPeriodo } from "@/lib/saude/analise-periodo"
import type {
  DadosMapaResumo,
  GeometriaGeoJson,
} from "@/lib/territorio/artefato-schema"
import { CORES_COROPLETICO, CORES_MAPA } from "@/lib/territorio/estilo-mapa"

// Mapa do relatório em SVG puro (TechSpec EP-05 §2, DEC-T-04, DV-49): projeção equirretangular com o fator
// `cos(latitude média)`, a mesma na prévia e no PDF, sem MapLibre, sem WebGL e sem tile (nada de rede no PDF). O
// significado nunca fica só na cor (DV-20): bairro destacado ganha contorno grosso e "sem dados" e "zero" têm traços
// próprios.

export type OpcoesProjecao = {
  largura: number
  altura: number
  margem: number
  /** Enquadra o limite municipal em vez dos bairros e o desenha; o padrão é só a sede, com `limite: null`. */
  incluirLimite?: boolean
}

export type MapaProjetado = {
  viewBox: string
  largura: number
  altura: number
  bairros: { id: string; d: string }[]
  limite: string | null
}

type Posicao = readonly [number, number]

const CASAS_DECIMAIS = 10

function arredondar(valor: number): number {
  return Math.round(valor * CASAS_DECIMAIS) / CASAS_DECIMAIS
}

function posicoesDe(geometria: GeometriaGeoJson): Posicao[] {
  return geometria.coordinates.flatMap((poligono) => poligono.flat())
}

/** Cada anel vira `M x y L ... Z`; os anéis de um bairro ficam num `d` só (com `fill-rule` par-ímpar nos furos). */
function caminhoDe(
  geometria: GeometriaGeoJson,
  projetar: (posicao: Posicao) => readonly [number, number]
): string {
  return geometria.coordinates
    .flatMap((poligono) => poligono)
    .map((anel) => {
      const pontos = anel.map((posicao) => projetar(posicao).join(" "))
      return `M${pontos.join(" L")} Z`
    })
    .join(" ")
}

/**
 * Projeta os bairros (e, se pedido, o limite) num `viewBox` fixo `largura x altura`, com `margem`, mantendo a
 * proporção e centrando o desenho. O eixo y cresce para baixo, então a latitude é invertida.
 */
export function projetarMapa(
  mapa: Pick<DadosMapaResumo, "bairros" | "limite">,
  { largura, altura, margem, incluirLimite = false }: OpcoesProjecao
): MapaProjetado {
  const enquadradas = incluirLimite
    ? posicoesDe(mapa.limite.geometria)
    : mapa.bairros.flatMap(({ geometria }) => posicoesDe(geometria))
  if (enquadradas.length === 0) {
    return {
      viewBox: `0 0 ${largura} ${altura}`,
      largura,
      altura,
      bairros: [],
      limite: null,
    }
  }
  const latitudes = enquadradas.map(([, latitude]) => latitude)
  const latitudeMedia = (Math.min(...latitudes) + Math.max(...latitudes)) / 2
  // Um grau de longitude é mais curto que um de latitude longe do equador: sem o fator o mapa sairia achatado.
  const fatorX = Math.cos((latitudeMedia * Math.PI) / 180)
  const x = ([longitude]: Posicao) => longitude * fatorX
  const y = ([, latitude]: Posicao) => -latitude
  const minX = Math.min(...enquadradas.map(x))
  const maxX = Math.max(...enquadradas.map(x))
  const minY = Math.min(...enquadradas.map(y))
  const maxY = Math.max(...enquadradas.map(y))
  const larguraUtil = largura - 2 * margem
  const alturaUtil = altura - 2 * margem
  const escala = Math.min(
    larguraUtil / (maxX - minX || 1),
    alturaUtil / (maxY - minY || 1)
  )
  const deslocamentoX = margem + (larguraUtil - (maxX - minX) * escala) / 2
  const deslocamentoY = margem + (alturaUtil - (maxY - minY) * escala) / 2
  const projetar = (posicao: Posicao) =>
    [
      arredondar(deslocamentoX + (x(posicao) - minX) * escala),
      arredondar(deslocamentoY + (y(posicao) - minY) * escala),
    ] as const

  return {
    viewBox: `0 0 ${largura} ${altura}`,
    largura,
    altura,
    bairros: mapa.bairros.map(({ id, geometria }) => ({
      id,
      d: caminhoDe(geometria, projetar),
    })),
    limite: incluirLimite ? caminhoDe(mapa.limite.geometria, projetar) : null,
  }
}

export type EstiloBairroSvg = {
  id: string
  d: string
  fill: string
  stroke: string
  strokeWidth: number
  /** `null` = traço contínuo. */
  strokeDasharray: string | null
  /** O que o desenho significa em texto, para a prévia nomear o bairro por leitor de tela. */
  situacao: "valor" | "zero" | "sem-dados" | "neutro"
  destacado: boolean
}

// Traços de "zero" e "sem dados" (a legenda do relatório desenha a mesma amostra).
export const TRACEJADO_ZERO = "5 2"
export const TRACEJADO_SEM_DADOS = "1 2.5"
export const LARGURA_CONTORNO = 0.8
export const LARGURA_CONTORNO_DESTAQUE = 3
const PREENCHIMENTO_NEUTRO = "#d9e6f2"

/**
 * Cor e traço de cada bairro. Sem `itens` (Território) o desenho é neutro; com `itens` (Saúde) o preenchimento é o da
 * classe do coroplético, "zero" e "sem dados" ficam em branco com traços diferentes e o bairro do filtro leva o
 * contorno grosso em qualquer um dos casos.
 */
export function estilizarBairros(
  mapa: MapaProjetado,
  {
    destaqueId,
    itens,
  }: { destaqueId: string | null; itens: readonly ItemBairroPeriodo[] | null }
): EstiloBairroSvg[] {
  const itemPorId = new Map(itens?.map((item) => [item.bairro.id, item]) ?? [])
  return mapa.bairros.map(({ id, d }) => {
    const item = itemPorId.get(id)
    const destacado = id === destaqueId
    const base = {
      id,
      d,
      destacado,
      stroke: destacado
        ? CORES_MAPA.bairroSelecionado
        : CORES_MAPA.bordaCoropletico,
      strokeWidth: destacado ? LARGURA_CONTORNO_DESTAQUE : LARGURA_CONTORNO,
    }
    if (!item) {
      return {
        ...base,
        fill: PREENCHIMENTO_NEUTRO,
        strokeDasharray: null,
        situacao: "neutro" as const,
      }
    }
    if (item.situacao === "valor") {
      const cor =
        CORES_COROPLETICO[(item.classe ?? 1) - 1] ?? CORES_COROPLETICO[0]
      return {
        ...base,
        fill: cor,
        strokeDasharray: null,
        situacao: "valor" as const,
      }
    }
    return {
      ...base,
      fill: CORES_MAPA.zeroPreenchimento,
      strokeDasharray:
        item.situacao === "zero" ? TRACEJADO_ZERO : TRACEJADO_SEM_DADOS,
      situacao: item.situacao,
    }
  })
}
