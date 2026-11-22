import type { GraficoSvg } from "@/lib/relatorios/grafico-svg"
import { CORES_COROPLETICO } from "@/lib/territorio/estilo-mapa"

type GraficoRelatorioProps = {
  grafico: GraficoSvg
  rotulo: string
}

const COR_DA_LINHA = CORES_COROPLETICO[4]
const COR_DO_EIXO = "#475569"
const COR_DA_GRADE = "#e2e8f0"
const TAMANHO_DO_TEXTO = 11

// Gráfico por período do relatório em SVG puro (DEC-T-04): linha, pontos e marcas dos eixos. A lacuna quebra a linha e
// fica dita no texto do relatório; os valores também estão na tabela, que é a alternativa em texto.
export function GraficoRelatorio({ grafico, rotulo }: GraficoRelatorioProps) {
  const { area } = grafico
  return (
    <svg
      role="img"
      aria-label={rotulo}
      viewBox={grafico.viewBox}
      className="h-auto w-full max-w-2xl rounded-lg border bg-white"
    >
      <title>{rotulo}</title>
      {grafico.eixoY.map(({ y, rotulo: marca }) => (
        <g key={`y-${y}`}>
          <line
            x1={area.esquerda}
            x2={area.direita}
            y1={y}
            y2={y}
            stroke={COR_DA_GRADE}
          />
          <text
            x={area.esquerda - 6}
            y={y + 4}
            textAnchor="end"
            fontSize={TAMANHO_DO_TEXTO}
            fill={COR_DO_EIXO}
          >
            {marca}
          </text>
        </g>
      ))}
      {grafico.eixoX.map(({ x, rotulo: marca }) => (
        <text
          key={`x-${marca}`}
          x={x}
          y={area.base + 16}
          textAnchor="middle"
          fontSize={TAMANHO_DO_TEXTO}
          fill={COR_DO_EIXO}
        >
          {marca}
        </text>
      ))}
      <line
        x1={area.esquerda}
        x2={area.direita}
        y1={area.base}
        y2={area.base}
        stroke={COR_DO_EIXO}
      />
      {grafico.trechos.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke={COR_DA_LINHA}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ))}
      {grafico.pontos.map(({ periodo, x, y }) => (
        <circle key={periodo} cx={x} cy={y} r={3.5} fill={COR_DA_LINHA} />
      ))}
    </svg>
  )
}
