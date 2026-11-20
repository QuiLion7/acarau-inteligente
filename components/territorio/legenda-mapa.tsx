import {
  TEXTOS_TERRITORIO,
  textoEscolasGeorreferenciadas,
} from "@/lib/config/textos-territorio"
import {
  CORES_MAPA,
  ESTADOS_COM_MARCADOR,
  ICONES_ESCOLA,
  type IconeEscola,
} from "@/lib/territorio/estilo-mapa"
import {
  totalDeMarcadores,
  type MarcadoresPorEstado,
} from "@/lib/territorio/filtro-escolas"
import { flexionar } from "@/lib/territorio/formato"

const FORMA_DO_SIMBOLO: Record<IconeEscola["forma"], string> = {
  circulo: "rounded-full",
  quadrado: "rounded-none",
  triangulo: "rounded-none [clip-path:polygon(50%_0,100%_100%,0_100%)]",
}

function SimboloDeEscola({ icone }: { icone: IconeEscola }) {
  return (
    <span
      aria-hidden
      className={`size-4 shrink-0 ${FORMA_DO_SIMBOLO[icone.forma]}`}
      style={{ backgroundColor: icone.cor }}
    />
  )
}

type LegendaMapaProps = {
  /** Contagem dos marcadores desenhados; `null` com a camada de escolas desligada (a legenda só descreve o visível). */
  marcadoresDeEscola: MarcadoresPorEstado | null
}

// Legenda em HTML (DV-20): o significado de cada símbolo vem do texto e da forma (preenchimento, contorno grosso,
// tracejado), nunca só da cor. Só descreve o que o mapa já desenha.
export function LegendaMapa({ marcadoresDeEscola }: LegendaMapaProps) {
  return (
    <section
      aria-labelledby="titulo-legenda-mapa"
      className="flex flex-col gap-2"
    >
      <h3 id="titulo-legenda-mapa" className="text-sm font-semibold">
        Legenda
      </h3>
      <ul className="flex flex-col gap-1.5 text-sm">
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-4 shrink-0 rounded-sm border"
            style={{
              backgroundColor: `${CORES_MAPA.bairro}40`,
              borderColor: CORES_MAPA.bairro,
            }}
          />
          Bairro da sede (Unidade de Vizinhança)
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-4 shrink-0 rounded-sm border-4"
            style={{
              backgroundColor: `${CORES_MAPA.bairro}80`,
              borderColor: CORES_MAPA.bairroSelecionado,
            }}
          />
          Bairro selecionado (contorno grosso)
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-0 w-4 shrink-0 border-t-2 border-dashed"
            style={{ borderColor: CORES_MAPA.limite }}
          />
          Limite municipal (tracejado)
        </li>
        {marcadoresDeEscola
          ? ESTADOS_COM_MARCADOR.map((estado) => (
              <li key={estado} className="flex items-center gap-2">
                <SimboloDeEscola icone={ICONES_ESCOLA[estado]} />
                {ICONES_ESCOLA[estado].rotulo}:{" "}
                {flexionar(
                  marcadoresDeEscola[estado],
                  "marcador",
                  "marcadores"
                )}
              </li>
            ))
          : null}
      </ul>
      {marcadoresDeEscola ? (
        <p className="text-sm">
          {textoEscolasGeorreferenciadas(totalDeMarcadores(marcadoresDeEscola))}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {TEXTOS_TERRITORIO.coberturaDemonstracao}
      </p>
    </section>
  )
}
