import { MapaRelatorio } from "@/components/relatorios/mapa-relatorio"
import { TEXTOS_RELATORIOS } from "@/lib/config/textos-relatorios"
import { estilizarBairros } from "@/lib/relatorios/mapa-svg"
import type {
  FiltrosDoRelatorio,
  SecaoTerritorio,
} from "@/lib/relatorios/tipos-relatorio"

const TEXTOS = TEXTOS_RELATORIOS.territorio

type SecaoTerritorioPreviaProps = {
  territorio: SecaoTerritorio
  bairro: FiltrosDoRelatorio["bairro"]
}

// Território (RF-05.09): os 24 bairros, o do filtro com contorno grosso, a fonte da geometria e o aviso de
// reconstrução técnica (RN-005). A lista de bairros é a alternativa em texto do mapa.
export function SecaoTerritorioPrevia({
  territorio,
  bairro,
}: SecaoTerritorioPreviaProps) {
  const estilos = estilizarBairros(territorio.mapa, {
    destaqueId: bairro?.id ?? null,
    itens: null,
  })
  return (
    <section
      aria-labelledby="previa-territorio"
      className="flex flex-col gap-3"
    >
      <h3 id="previa-territorio" className="text-xl font-semibold">
        {TEXTOS_RELATORIOS.secoes.territorio}
      </h3>
      <MapaRelatorio
        mapa={territorio.mapa}
        estilos={estilos}
        rotulo={TEXTOS.mapa}
      />
      <ul aria-label={TEXTOS.legenda} className="flex flex-col gap-1 text-sm">
        <li>{TEXTOS.bairro}</li>
        {bairro ? <li>{TEXTOS.bairroDestacado(bairro.nome)}</li> : null}
      </ul>
      <p className="text-sm">
        <span className="font-medium">{TEXTOS.geometria}:</span>{" "}
        {territorio.fonteGeometria}
      </p>
      <p className="text-sm text-muted-foreground">
        {territorio.avisoReconstrucao}
      </p>
    </section>
  )
}
