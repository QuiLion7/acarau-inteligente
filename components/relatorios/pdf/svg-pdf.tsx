import { Circle, G, Line, Path, Svg, Text } from "@react-pdf/renderer"

import { estilos, FAMILIA } from "@/components/relatorios/pdf/estilos-pdf"
import type { GraficoSvg } from "@/lib/relatorios/grafico-svg"
import type { EstiloBairroSvg, MapaProjetado } from "@/lib/relatorios/mapa-svg"
import { CORES_COROPLETICO } from "@/lib/territorio/estilo-mapa"

const LARGURA_NA_PAGINA = 400

// Os mesmos `d` da prévia (DEC-T-04), desenhados com as primitivas SVG do react-pdf: sem WebGL, sem tile, sem rede.
export function MapaPdf({
  mapa,
  estilosDosBairros,
}: {
  mapa: MapaProjetado
  estilosDosBairros: readonly EstiloBairroSvg[]
}) {
  const altura = (LARGURA_NA_PAGINA * mapa.altura) / mapa.largura
  return (
    <Svg
      viewBox={mapa.viewBox}
      width={LARGURA_NA_PAGINA}
      height={altura}
      style={estilos.imagem}
    >
      {estilosDosBairros.map((estilo) => (
        <Path
          key={estilo.id}
          d={estilo.d}
          fill={estilo.fill}
          fillRule="evenodd"
          stroke={estilo.stroke}
          strokeWidth={estilo.strokeWidth}
          strokeDasharray={estilo.strokeDasharray ?? undefined}
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  )
}

const COR_DA_LINHA = CORES_COROPLETICO[4]
const COR_DO_EIXO = "#475569"
const COR_DA_GRADE = "#e2e8f0"

export function GraficoPdf({ grafico }: { grafico: GraficoSvg }) {
  const { area } = grafico
  const altura = (LARGURA_NA_PAGINA * grafico.altura) / grafico.largura
  return (
    <Svg
      viewBox={grafico.viewBox}
      width={LARGURA_NA_PAGINA}
      height={altura}
      style={estilos.imagem}
    >
      {grafico.eixoY.map(({ y, rotulo }) => (
        <G key={`y-${y}`}>
          <Line
            x1={area.esquerda}
            x2={area.direita}
            y1={y}
            y2={y}
            stroke={COR_DA_GRADE}
            strokeWidth={0.8}
          />
          <Text
            x={area.esquerda - 6}
            y={y + 3}
            textAnchor="end"
            style={{ fontFamily: FAMILIA, fontSize: 10 }}
            fill={COR_DO_EIXO}
          >
            {rotulo}
          </Text>
        </G>
      ))}
      {grafico.eixoX.map(({ x, rotulo }) => (
        <Text
          key={`x-${rotulo}`}
          x={x}
          y={area.base + 16}
          textAnchor="middle"
          style={{ fontFamily: FAMILIA, fontSize: 10 }}
          fill={COR_DO_EIXO}
        >
          {rotulo}
        </Text>
      ))}
      <Line
        x1={area.esquerda}
        x2={area.direita}
        y1={area.base}
        y2={area.base}
        stroke={COR_DO_EIXO}
        strokeWidth={1}
      />
      {grafico.trechos.map((d) => (
        <Path
          key={d}
          d={d}
          fill="none"
          stroke={COR_DA_LINHA}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ))}
      {grafico.pontos.map(({ periodo, x, y }) => (
        <Circle key={periodo} cx={x} cy={y} r={3.5} fill={COR_DA_LINHA} />
      ))}
    </Svg>
  )
}
