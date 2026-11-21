import { Info } from "lucide-react"

import { TEXTOS_SAUDE } from "@/lib/config/textos-saude"

// A taxa não é calculada: a demonstração não tem a população por bairro e período (RF-02.37, RN-02.13).
export function NotaTaxa() {
  return (
    <p className="flex max-w-prose items-start gap-2 text-sm text-muted-foreground">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      {TEXTOS_SAUDE.taxa}
    </p>
  )
}
