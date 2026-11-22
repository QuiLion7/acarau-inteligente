import { MapaPdf } from "@/components/relatorios/pdf/svg-pdf"
import {
  ListaPdf,
  ParagrafoPdf,
  SecaoPdf,
} from "@/components/relatorios/pdf/primitivas-pdf"
import { TEXTOS_RELATORIOS } from "@/lib/config/textos-relatorios"
import { estilizarBairros } from "@/lib/relatorios/mapa-svg"
import type {
  FiltrosDoRelatorio,
  SecaoTerritorio,
} from "@/lib/relatorios/tipos-relatorio"

const TEXTOS = TEXTOS_RELATORIOS.territorio

// Território (RF-05.09): o mapa dos 24 bairros com o do filtro em contorno grosso, a fonte da geometria e o aviso de
// reconstrução técnica. É o mesmo desenho e o mesmo texto da prévia.
export function SecaoTerritorioPdf({
  territorio,
  bairro,
}: {
  territorio: SecaoTerritorio
  bairro: FiltrosDoRelatorio["bairro"]
}) {
  const estilosDosBairros = estilizarBairros(territorio.mapa, {
    destaqueId: bairro?.id ?? null,
    itens: null,
  })
  return (
    <SecaoPdf titulo={TEXTOS_RELATORIOS.secoes.territorio}>
      <MapaPdf mapa={territorio.mapa} estilosDosBairros={estilosDosBairros} />
      <ListaPdf
        itens={[
          TEXTOS.bairro,
          ...(bairro ? [TEXTOS.bairroDestacado(bairro.nome)] : []),
        ]}
      />
      <ParagrafoPdf>{`${TEXTOS.geometria}: ${territorio.fonteGeometria}`}</ParagrafoPdf>
      <ParagrafoPdf suave>{territorio.avisoReconstrucao}</ParagrafoPdf>
    </SecaoPdf>
  )
}
