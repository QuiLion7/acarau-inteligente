import {
  ClipboardList,
  FileText,
  GraduationCap,
  HardHat,
  HeartPulse,
  Map,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"

import { temPapel, type Papel } from "@/lib/auth/papeis"

export type Modulo = {
  id: string
  rotulo: string
  rota: string
  descricao: string
  icone: LucideIcon
  papelMinimo: Papel
}

// Os cinco módulos da demo (DV-10): módulo novo entra aqui e aparece no menu e nos atalhos do início.
export const MODULOS: readonly Modulo[] = [
  {
    id: "territorio",
    rotulo: "Território",
    rota: "/territorio",
    descricao: "Bairros da sede, escolas e camadas do mapa.",
    icone: Map,
    papelMinimo: "visitante",
  },
  {
    id: "saude",
    rotulo: "Saúde",
    rota: "/saude",
    descricao: "Indicadores de saúde por bairro e período.",
    icone: HeartPulse,
    papelMinimo: "visitante",
  },
  {
    id: "educacao",
    rotulo: "Educação",
    rota: "/educacao",
    descricao: "Escolas e indicadores de educação por bairro.",
    icone: GraduationCap,
    papelMinimo: "visitante",
  },
  {
    id: "obras",
    rotulo: "Obras",
    rota: "/obras",
    descricao: "Acompanhamento de obras no território.",
    icone: HardHat,
    papelMinimo: "visitante",
  },
  {
    id: "relatorios",
    rotulo: "Relatórios",
    rota: "/relatorios",
    descricao: "Relatórios com fontes e limitações.",
    icone: FileText,
    papelMinimo: "visitante",
  },
]

// Áreas restritas: só aparecem no menu para quem tem o papel (a autorização é do servidor, seguranca.md §1).
export const AREAS_RESTRITAS: readonly Modulo[] = [
  {
    id: "analista",
    rotulo: "Área do analista",
    rota: "/analista",
    descricao: "Operações do analista.",
    icone: ClipboardList,
    papelMinimo: "analista",
  },
  {
    id: "administracao",
    rotulo: "Administração",
    rota: "/admin",
    descricao: "Operações de administração.",
    icone: ShieldCheck,
    papelMinimo: "administrador",
  },
]

export function itensDoMenu(papel: Papel): Modulo[] {
  return [...MODULOS, ...AREAS_RESTRITAS].filter((item) =>
    temPapel(papel, item.papelMinimo)
  )
}

export function moduloPorId(id: string): Modulo {
  const modulo = [...MODULOS, ...AREAS_RESTRITAS].find((item) => item.id === id)
  if (!modulo) throw new Error(`Módulo fora do catálogo: ${id}`)
  return modulo
}

export function moduloAtivo(rota: string, pathname: string): boolean {
  return pathname === rota || pathname.startsWith(`${rota}/`)
}
