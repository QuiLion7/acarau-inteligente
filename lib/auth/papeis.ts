// Ordem crescente de privilégio (DV-06); o papel vem da conta no ambiente a cada validação.
const ORDEM_PAPEIS = ["visitante", "analista", "administrador"] as const

export type Papel = (typeof ORDEM_PAPEIS)[number]
export type PapelRestrito = Exclude<Papel, "visitante">

// Identificação de quem tem sessão válida (TechSpec §4.6); visitante não tem sessão.
export type SessaoValida = {
  usuario: string
  nome: string
  papel: PapelRestrito
}

export function temPapel(atual: Papel, minimo: Papel): boolean {
  return ORDEM_PAPEIS.indexOf(atual) >= ORDEM_PAPEIS.indexOf(minimo)
}

const ROTULOS_PAPEL: Record<PapelRestrito, string> = {
  analista: "Analista",
  administrador: "Administrador",
}

export function rotuloDoPapel(papel: PapelRestrito): string {
  return ROTULOS_PAPEL[papel]
}
