// Formatação dos datasets para a tela, em pt-BR. O fuso é fixo (Acaraú, Ceará) para a mesma data aparecer igual
// para quem abre de qualquer lugar e nos testes.
const formatadorDeDataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Fortaleza",
})

/** "2026-11-20T14:02:11.000Z" → "20/11/2026, 11:02". */
export function formatarDataHora(instanteIso: string): string {
  return formatadorDeDataHora.format(new Date(instanteIso))
}

/** ["2025", "2026"] → "2025 a 2026"; um período só aparece sozinho; sem períodos, hífen. */
export function rotuloDosPeriodos(periodos: readonly string[]): string {
  const primeiro = periodos[0]
  const ultimo = periodos.at(-1)
  if (primeiro === undefined || ultimo === undefined) return "-"
  return primeiro === ultimo ? primeiro : `${primeiro} a ${ultimo}`
}
