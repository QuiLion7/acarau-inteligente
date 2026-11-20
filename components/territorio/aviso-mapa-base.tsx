import { TriangleAlert } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { TEXTOS_TERRITORIO } from "@/lib/config/textos-territorio"

// Fundo do OSM fora do ar: as camadas da demonstração seguem visíveis (RF-01.10).
export function AvisoMapaBase() {
  return (
    <Alert role="status" data-testid="aviso-mapa-base">
      <TriangleAlert aria-hidden />
      <AlertDescription>{TEXTOS_TERRITORIO.fundoIndisponivel}</AlertDescription>
    </Alert>
  )
}
