import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { SELO_DEMONSTRACAO } from "@/lib/config/textos-demonstracao"

// Selo permanente (RN-00.05); leva ao aviso completo de demonstração (RF-00.10).
export function SeloDemonstracao() {
  return (
    <Badge
      variant="outline"
      render={<Link href="/sobre" />}
      className="h-6 border-primary/40 px-2.5 text-primary"
    >
      {SELO_DEMONSTRACAO}
    </Badge>
  )
}
