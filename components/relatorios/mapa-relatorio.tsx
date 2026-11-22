import type { EstiloBairroSvg, MapaProjetado } from "@/lib/relatorios/mapa-svg"

type MapaRelatorioProps = {
  mapa: MapaProjetado
  estilos: readonly EstiloBairroSvg[]
  /** Nome acessível do desenho; a tabela ao lado é a alternativa em texto (RN-023). */
  rotulo: string
}

// Mapa do relatório em SVG puro (DEC-T-04): o mesmo `d` que o PDF desenha, sem WebGL nem tile. O significado não fica
// só na cor: o destaque tem contorno grosso e "zero" e "sem dados" têm traços próprios (legenda em texto ao lado).
export function MapaRelatorio({ mapa, estilos, rotulo }: MapaRelatorioProps) {
  return (
    <svg
      role="img"
      aria-label={rotulo}
      viewBox={mapa.viewBox}
      className="h-auto w-full max-w-2xl rounded-lg border bg-white"
    >
      <title>{rotulo}</title>
      {estilos.map((estilo) => (
        <path
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
    </svg>
  )
}
